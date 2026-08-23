import "server-only";

import { Buffer } from "node:buffer";

import { z } from "zod";

import {
  assertConfiguredContentPath,
  isSafeGitBranchName,
} from "@/core/config";
import { SakkaError, type SakkaErrorCategory } from "@/core/errors";
import type {
  BranchHead,
  DraftPullRequest,
  FileWrite,
  FileWriteResult,
  RepositoryGateway,
} from "@/core/repository-gateway";
import type {
  ContentItem,
  ContentVersion,
  PullRequestReference,
  SakkaConfiguration,
} from "@/core/models";

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const githubApiOrigin = "https://api.github.com";

const branchRefSchema = z.object({
  object: z.object({ sha: z.string().min(1) }),
});

const contentFileSchema = z.object({
  type: z.literal("file"),
  path: z.string().min(1),
  sha: z.string().min(1),
  encoding: z.literal("base64"),
  content: z.string(),
});

const contentListSchema = z.array(
  z.object({
    type: z.enum(["file", "dir"]),
    name: z.string().min(1),
    path: z.string().min(1),
  }),
);

const fileWriteSchema = z.object({
  content: z.object({ sha: z.string().min(1) }),
  commit: z.object({ sha: z.string().min(1) }),
});

const pullRequestSchema = z.object({
  number: z.number().int().positive(),
  html_url: z.string().url(),
  state: z.enum(["open", "closed"]),
});

function encodeRepositoryPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

function assertSafeBranch(branch: string): void {
  if (!isSafeGitBranchName(branch)) {
    throw new SakkaError({
      category: "validation",
      message: "Sakka cannot use this Git branch name.",
    });
  }
}

function githubErrorFor(response: Response): SakkaError {
  let category: SakkaErrorCategory;
  let message: string;
  let retryable = false;

  if (response.status === 401) {
    category = "unauthenticated";
    message = "Your GitHub authorization has expired. Sign in again.";
  } else if (
    response.status === 403 &&
    response.headers.get("x-ratelimit-remaining") === "0"
  ) {
    category = "rate_limited";
    message = "GitHub is temporarily rate-limiting Sakka. Try again shortly.";
    retryable = true;
  } else if (response.status === 403) {
    category = "unauthorized";
    message = "You do not have permission to perform this GitHub action.";
  } else if (response.status === 404) {
    category = "not_found";
    message = "The configured GitHub content could not be found.";
  } else if (response.status === 409) {
    category = "conflict";
    message = "This article changed while you were editing it.";
  } else if (response.status === 422) {
    category = "validation";
    message =
      "GitHub rejected this request. Check the content and branch details.";
  } else if (response.status >= 500) {
    category = "transient";
    message = "GitHub is temporarily unavailable. Try again shortly.";
    retryable = true;
  } else {
    category = "transient";
    message = "Sakka could not complete the GitHub request. Try again.";
    retryable = true;
  }

  return new SakkaError({ category, message, retryable });
}

function toPullRequestReference(value: unknown): PullRequestReference {
  const parsed = pullRequestSchema.safeParse(value);
  if (!parsed.success) {
    throw new SakkaError({
      category: "transient",
      message:
        "GitHub returned an unexpected pull request response. Try again.",
      retryable: true,
    });
  }

  return {
    number: parsed.data.number,
    url: parsed.data.html_url,
    state: parsed.data.state,
  };
}

export class GitHubRepositoryAdapter implements RepositoryGateway {
  constructor(
    private readonly configuration: SakkaConfiguration,
    private readonly accessToken: string,
    private readonly fetchImplementation: FetchImplementation = fetch,
  ) {}

  async getBranchHead(branch: string): Promise<BranchHead> {
    assertSafeBranch(branch);
    const response = await this.request(
      `/git/ref/heads/${encodeRepositoryPath(branch)}`,
    );
    const parsed = branchRefSchema.safeParse(response);
    if (!parsed.success) {
      throw this.unexpectedResponseError();
    }

    return { branch, commitSha: parsed.data.object.sha };
  }

  async listContentItems(branch: string): Promise<ContentItem[]> {
    assertSafeBranch(branch);
    const response = await this.request(
      `/contents/${encodeRepositoryPath(this.configuration.contentDirectory)}?ref=${encodeURIComponent(branch)}`,
    );
    const parsed = contentListSchema.safeParse(response);
    if (!parsed.success) {
      throw this.unexpectedResponseError();
    }

    return parsed.data.flatMap((entry) => {
      const extension = `.${entry.name.split(".").at(-1)}`;
      if (
        entry.type !== "file" ||
        !this.configuration.contentExtensions.includes(extension)
      ) {
        return [];
      }

      assertConfiguredContentPath(this.configuration, entry.path);
      const filename = entry.name;
      const slug = filename.slice(0, -extension.length);
      const kind = extension === ".mdx" ? "mdx" : "markdown";

      return [
        {
          path: entry.path,
          filename,
          slug,
          kind,
          sourceStatus: kind === "markdown" ? "supported" : "source_only",
        },
      ];
    });
  }

  async readContent(path: string, branch: string): Promise<ContentVersion> {
    assertConfiguredContentPath(this.configuration, path);
    assertSafeBranch(branch);

    const response = await this.request(
      `/contents/${encodeRepositoryPath(path)}?ref=${encodeURIComponent(branch)}`,
    );
    const parsed = contentFileSchema.safeParse(response);
    if (!parsed.success) {
      throw this.unexpectedResponseError();
    }

    return {
      path: parsed.data.path,
      branch,
      source: Buffer.from(
        parsed.data.content.replaceAll("\n", ""),
        "base64",
      ).toString("utf8"),
      fileSha: parsed.data.sha,
    };
  }

  async createWorkingBranch(
    branch: string,
    baseCommitSha: string,
  ): Promise<BranchHead> {
    assertSafeBranch(branch);

    const response = await this.request("/git/refs", {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseCommitSha }),
    });
    const parsed = branchRefSchema.safeParse(response);
    if (!parsed.success) {
      throw this.unexpectedResponseError();
    }

    return { branch, commitSha: parsed.data.object.sha };
  }

  async writeFile(write: FileWrite): Promise<FileWriteResult> {
    assertConfiguredContentPath(this.configuration, write.path);
    assertSafeBranch(write.branch);

    const response = await this.request(
      `/contents/${encodeRepositoryPath(write.path)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          message: write.message,
          content: Buffer.from(write.source).toString("base64"),
          branch: write.branch,
          ...(write.expectedFileSha ? { sha: write.expectedFileSha } : {}),
        }),
      },
    );
    const parsed = fileWriteSchema.safeParse(response);
    if (!parsed.success) {
      throw this.unexpectedResponseError();
    }

    return {
      fileSha: parsed.data.content.sha,
      commitSha: parsed.data.commit.sha,
    };
  }

  async findOpenDraftPullRequest(
    head: string,
    base: string,
  ): Promise<PullRequestReference | undefined> {
    assertSafeBranch(head);
    assertSafeBranch(base);
    const search = new URLSearchParams({
      state: "open",
      head: `${this.configuration.repository.owner}:${head}`,
      base,
    });
    const response = await this.request(`/pulls?${search.toString()}`);
    const parsed = z.array(pullRequestSchema).safeParse(response);
    if (!parsed.success) {
      throw this.unexpectedResponseError();
    }

    return parsed.data[0]
      ? {
          number: parsed.data[0].number,
          url: parsed.data[0].html_url,
          state: parsed.data[0].state,
        }
      : undefined;
  }

  async createDraftPullRequest(
    pullRequest: DraftPullRequest,
  ): Promise<PullRequestReference> {
    assertSafeBranch(pullRequest.head);
    assertSafeBranch(pullRequest.base);

    const response = await this.request("/pulls", {
      method: "POST",
      body: JSON.stringify({ ...pullRequest, draft: true }),
    });

    return toPullRequestReference(response);
  }

  private async request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const response = await this.fetchImplementation(
      new URL(
        `/repos/${this.configuration.repository.owner}/${this.configuration.repository.repository}${path}`,
        githubApiOrigin,
      ),
      {
        ...init,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${this.accessToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      },
    );

    if (!response.ok) {
      throw githubErrorFor(response);
    }

    return response.status === 204 ? undefined : response.json();
  }

  private unexpectedResponseError(): SakkaError {
    return new SakkaError({
      category: "transient",
      message: "GitHub returned an unexpected response. Try again.",
      retryable: true,
    });
  }
}
