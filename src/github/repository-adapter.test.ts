import { describe, expect, it, vi } from "vitest";

import { parseSakkaConfiguration } from "@/core/config";
import { SakkaError } from "@/core/errors";
import { GitHubRepositoryAdapter } from "@/github/repository-adapter";

const configuration = parseSakkaConfiguration({
  SAKKA_GITHUB_OWNER: "teemoto",
  SAKKA_GITHUB_REPOSITORY: "aslambhai",
  SAKKA_GITHUB_BASE_BRANCH: "sakka/dogfood",
  SAKKA_CONTENT_DIRECTORY: "src/content/articles",
  SAKKA_CONTENT_EXTENSIONS: ".md,.mdx",
  SAKKA_FRONTMATTER_FIELDS:
    "title,description,publishedAt,minutes,topic,icon,draft,featured",
});

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function createAdapter(responses: Response[]) {
  const fetchImplementation = vi.fn<
    (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  >(async () => {
    const response = responses.shift();
    if (!response) throw new Error("Unexpected GitHub request.");
    return response;
  });

  return {
    adapter: new GitHubRepositoryAdapter(
      configuration,
      "secret-user-token",
      fetchImplementation,
    ),
    fetchImplementation,
  };
}

describe("GitHubRepositoryAdapter", () => {
  it("reads configured source with a server-side token and exact branch", async () => {
    const { adapter, fetchImplementation } = createAdapter([
      jsonResponse({
        type: "file",
        path: "src/content/articles/hello.md",
        sha: "file-sha",
        encoding: "base64",
        content: Buffer.from("# Hello\n").toString("base64"),
      }),
    ]);

    await expect(
      adapter.readContent("src/content/articles/hello.md", "sakka/dogfood"),
    ).resolves.toEqual({
      path: "src/content/articles/hello.md",
      branch: "sakka/dogfood",
      source: "# Hello\n",
      fileSha: "file-sha",
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL(
        "https://api.github.com/repos/teemoto/aslambhai/contents/src/content/articles/hello.md?ref=sakka%2Fdogfood",
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-user-token",
        }),
      }),
    );
  });

  it("uses the opened SHA and maps a stale GitHub write to conflict", async () => {
    const { adapter, fetchImplementation } = createAdapter([
      jsonResponse({ message: "does not match old-sha" }, 409),
    ]);

    await expect(
      adapter.writeFile({
        path: "src/content/articles/hello.md",
        branch: "sakka/teemoto/hello-a1b2c3d4",
        source: "# Updated\n",
        expectedFileSha: "old-sha",
        message: "docs: update hello",
      }),
    ).rejects.toMatchObject({
      category: "conflict",
      message: "This article changed while you were editing it.",
    } satisfies Partial<SakkaError>);

    const [, request] = fetchImplementation.mock.calls[0] ?? [];
    expect(JSON.parse((request as RequestInit).body as string)).toMatchObject({
      sha: "old-sha",
      branch: "sakka/teemoto/hello-a1b2c3d4",
    });
  });

  it("creates a draft pull request with an explicit safe head and base", async () => {
    const { adapter, fetchImplementation } = createAdapter([
      jsonResponse(
        {
          number: 42,
          html_url: "https://github.com/teemoto/aslambhai/pull/42",
          state: "open",
        },
        201,
      ),
    ]);

    await expect(
      adapter.createDraftPullRequest({
        title: "Update hello",
        body: "Created by Sakka.",
        head: "sakka/teemoto/hello-a1b2c3d4",
        base: "sakka/dogfood",
      }),
    ).resolves.toEqual({
      number: 42,
      url: "https://github.com/teemoto/aslambhai/pull/42",
      state: "open",
    });

    const [, request] = fetchImplementation.mock.calls[0] ?? [];
    expect(JSON.parse((request as RequestInit).body as string)).toEqual({
      title: "Update hello",
      body: "Created by Sakka.",
      head: "sakka/teemoto/hello-a1b2c3d4",
      base: "sakka/dogfood",
      draft: true,
    });
  });

  it("does not request GitHub for a path outside the configured content target", async () => {
    const { adapter, fetchImplementation } = createAdapter([]);

    await expect(
      adapter.readContent("src/content/pages/about.md", "sakka/dogfood"),
    ).rejects.toMatchObject({
      category: "validation",
    } satisfies Partial<SakkaError>);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });
});
