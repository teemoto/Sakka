import { describe, expect, it } from "vitest";

import { parseSakkaConfiguration } from "@/core/config";
import type { DraftStore } from "@/core/draft-store";
import { DraftWorkflow } from "@/core/draft-workflow";
import { SakkaError } from "@/core/errors";
import type { Draft } from "@/core/models";
import type {
  BranchHead,
  DraftPullRequest,
  FileWrite,
  FileWriteResult,
  RepositoryGateway,
} from "@/core/repository-gateway";

const configuration = parseSakkaConfiguration({
  SAKKA_GITHUB_OWNER: "teemoto",
  SAKKA_GITHUB_REPOSITORY: "aslambhai",
  SAKKA_GITHUB_BASE_BRANCH: "sakka/dogfood",
  SAKKA_CONTENT_DIRECTORY: "src/content/articles",
  SAKKA_CONTENT_EXTENSIONS: ".md,.mdx",
  SAKKA_FRONTMATTER_FIELDS:
    "title,description,publishedAt,minutes,topic,icon,draft,featured",
});

const openedVersion = {
  path: "src/content/articles/hello.md",
  branch: "sakka/dogfood",
  source: "# Hello\n",
  fileSha: "base-file-sha",
  baseCommitSha: "base-commit-sha",
};

class MemoryDraftStore implements DraftStore {
  private readonly drafts = new Map<string, Draft>();

  async get(id: string): Promise<Draft | undefined> {
    return this.drafts.get(id);
  }

  async save(draft: Draft): Promise<void> {
    this.drafts.set(draft.id, draft);
  }
}

class FakeRepositoryGateway implements RepositoryGateway {
  readonly createdBranches: Array<{ branch: string; baseCommitSha: string }> =
    [];
  readonly writes: FileWrite[] = [];
  readonly createdPullRequests: DraftPullRequest[] = [];
  branchHeadError?: Error;
  existingPullRequest: Awaited<
    ReturnType<RepositoryGateway["findOpenDraftPullRequest"]>
  >;

  async getBranchHead(branch: string): Promise<BranchHead> {
    if (this.branchHeadError) throw this.branchHeadError;
    return { branch, commitSha: "commit-sha" };
  }

  async listContentItems() {
    return [];
  }

  async readContent() {
    return openedVersion;
  }

  async createWorkingBranch(
    branch: string,
    baseCommitSha: string,
  ): Promise<BranchHead> {
    this.createdBranches.push({ branch, baseCommitSha });
    return { branch, commitSha: baseCommitSha };
  }

  async writeFile(write: FileWrite): Promise<FileWriteResult> {
    this.writes.push(write);
    return { fileSha: "saved-file-sha", commitSha: "saved-commit-sha" };
  }

  async findOpenDraftPullRequest() {
    return this.existingPullRequest;
  }

  async createDraftPullRequest(pullRequest: DraftPullRequest) {
    this.createdPullRequests.push(pullRequest);
    return {
      number: 7,
      url: "https://github.com/teemoto/aslambhai/pull/7",
      state: "open" as const,
    };
  }
}

async function startDraft(workflow: DraftWorkflow) {
  return workflow.startDraft({
    id: "draft_123",
    path: openedVersion.path,
    openedVersion,
  });
}

describe("DraftWorkflow", () => {
  it("creates one working branch and one SHA-guarded commit for a changed save", async () => {
    const repository = new FakeRepositoryGateway();
    const workflow = new DraftWorkflow(
      configuration,
      repository,
      new MemoryDraftStore(),
    );
    await startDraft(workflow);

    const saved = await workflow.save({
      draftId: "draft_123",
      openedVersion,
      source: "# Updated\n",
      authorLogin: "teemoto",
      articleSlug: "hello",
      branchSuffix: "a1b2c3d4",
      commitMessage: "docs: update hello",
    });

    expect(repository.createdBranches).toEqual([
      {
        branch: "sakka/teemoto/hello-a1b2c3d4",
        baseCommitSha: "base-commit-sha",
      },
    ]);
    expect(repository.writes).toEqual([
      {
        path: "src/content/articles/hello.md",
        branch: "sakka/teemoto/hello-a1b2c3d4",
        source: "# Updated\n",
        expectedFileSha: "base-file-sha",
        message: "docs: update hello",
      },
    ]);
    expect(saved).toMatchObject({
      commitCreated: true,
      fileSha: "saved-file-sha",
      commitSha: "saved-commit-sha",
    });
  });

  it("does not create a branch or commit for unchanged source", async () => {
    const repository = new FakeRepositoryGateway();
    const workflow = new DraftWorkflow(
      configuration,
      repository,
      new MemoryDraftStore(),
    );
    await startDraft(workflow);

    const saved = await workflow.save({
      draftId: "draft_123",
      openedVersion,
      source: openedVersion.source,
      authorLogin: "teemoto",
      articleSlug: "hello",
      branchSuffix: "a1b2c3d4",
      commitMessage: "docs: update hello",
    });

    expect(saved.commitCreated).toBe(false);
    expect(repository.createdBranches).toEqual([]);
    expect(repository.writes).toEqual([]);
  });

  it("reconciles an existing pull request instead of creating another", async () => {
    const repository = new FakeRepositoryGateway();
    const store = new MemoryDraftStore();
    const workflow = new DraftWorkflow(configuration, repository, store);
    await startDraft(workflow);
    await workflow.save({
      draftId: "draft_123",
      openedVersion,
      source: "# Updated\n",
      authorLogin: "teemoto",
      articleSlug: "hello",
      branchSuffix: "a1b2c3d4",
      commitMessage: "docs: update hello",
    });
    repository.existingPullRequest = {
      number: 8,
      url: "https://github.com/teemoto/aslambhai/pull/8",
      state: "open",
    };

    const published = await workflow.publish({
      draftId: "draft_123",
      title: "Update hello",
    });

    expect(published.outcome).toBe("reconciled");
    expect(published.pullRequest.number).toBe(8);
    expect(repository.createdPullRequests).toEqual([]);
  });

  it("recreates a persisted working branch after an interrupted branch creation", async () => {
    const repository = new FakeRepositoryGateway();
    const store = new MemoryDraftStore();
    const workflow = new DraftWorkflow(configuration, repository, store);
    await startDraft(workflow);
    repository.branchHeadError = new SakkaError({
      category: "not_found",
      message: "The branch does not exist yet.",
    });
    await store.save({
      id: "draft_123",
      path: openedVersion.path,
      baseBranch: "sakka/dogfood",
      baseCommitSha: "base-commit-sha",
      workingBranch: "sakka/teemoto/hello-a1b2c3d4",
      currentFileSha: "base-file-sha",
    });

    await workflow.save({
      draftId: "draft_123",
      openedVersion: {
        ...openedVersion,
        branch: "sakka/teemoto/hello-a1b2c3d4",
      },
      source: "# Updated\n",
      authorLogin: "teemoto",
      articleSlug: "hello",
      branchSuffix: "a1b2c3d4",
      commitMessage: "docs: update hello",
    });

    expect(repository.createdBranches).toEqual([
      {
        branch: "sakka/teemoto/hello-a1b2c3d4",
        baseCommitSha: "base-commit-sha",
      },
    ]);
  });

  it("requires a changed save before publishing", async () => {
    const repository = new FakeRepositoryGateway();
    const workflow = new DraftWorkflow(
      configuration,
      repository,
      new MemoryDraftStore(),
    );
    await startDraft(workflow);

    await expect(
      workflow.publish({ draftId: "draft_123", title: "Update hello" }),
    ).rejects.toMatchObject({
      category: "validation",
    } satisfies Partial<SakkaError>);
  });
});
