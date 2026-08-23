import {
  assertConfiguredContentPath,
  createWorkingBranchName,
} from "@/core/config";
import { SakkaError } from "@/core/errors";
import type {
  ContentVersion,
  Draft,
  PublishResult,
  SakkaConfiguration,
  SaveResult,
} from "@/core/models";
import type { DraftStore } from "@/core/draft-store";
import type { RepositoryGateway } from "@/core/repository-gateway";

type StartDraftInput = {
  id: string;
  path: string;
  openedVersion: ContentVersion;
};

type SaveDraftInput = {
  draftId: string;
  openedVersion: ContentVersion;
  source: string;
  authorLogin: string;
  articleSlug: string;
  branchSuffix: string;
  commitMessage: string;
};

type PublishDraftInput = {
  draftId: string;
  title: string;
  body?: string;
};

export class DraftWorkflow {
  constructor(
    private readonly configuration: SakkaConfiguration,
    private readonly repository: RepositoryGateway,
    private readonly draftStore: DraftStore,
  ) {}

  async startDraft(input: StartDraftInput): Promise<Draft> {
    assertConfiguredContentPath(this.configuration, input.path);

    if (
      input.path !== input.openedVersion.path ||
      input.openedVersion.branch !== this.configuration.baseBranch ||
      !input.openedVersion.baseCommitSha
    ) {
      throw new SakkaError({
        category: "validation",
        message: "Sakka cannot start a draft from this content version.",
      });
    }

    const draft: Draft = {
      id: input.id,
      path: input.path,
      baseBranch: this.configuration.baseBranch,
      baseCommitSha: input.openedVersion.baseCommitSha,
      currentFileSha: input.openedVersion.fileSha,
    };
    await this.draftStore.save(draft);
    return draft;
  }

  async save(input: SaveDraftInput): Promise<SaveResult> {
    const draft = await this.requireDraft(input.draftId);
    this.assertOpenedVersionMatchesDraft(draft, input.openedVersion);

    if (input.source === input.openedVersion.source) {
      return {
        draft,
        commitCreated: false,
        fileSha: input.openedVersion.fileSha,
      };
    }

    const workingDraft = await this.ensureWorkingBranch(draft, input);
    const write = await this.repository.writeFile({
      path: workingDraft.path,
      branch: workingDraft.workingBranch,
      source: input.source,
      expectedFileSha: input.openedVersion.fileSha,
      message: input.commitMessage,
    });
    const savedDraft: Draft = {
      ...workingDraft,
      currentFileSha: write.fileSha,
      lastCommitSha: write.commitSha,
    };
    await this.draftStore.save(savedDraft);

    return {
      draft: savedDraft,
      commitCreated: true,
      fileSha: write.fileSha,
      commitSha: write.commitSha,
    };
  }

  async publish(input: PublishDraftInput): Promise<PublishResult> {
    const draft = await this.requireDraft(input.draftId);
    if (!draft.workingBranch || !draft.lastCommitSha) {
      throw new SakkaError({
        category: "validation",
        message: "Save a change before creating a pull request.",
      });
    }

    const existing = await this.repository.findOpenDraftPullRequest(
      draft.workingBranch,
      draft.baseBranch,
    );
    const pullRequest =
      existing ??
      (await this.repository.createDraftPullRequest({
        title: input.title,
        body: input.body,
        head: draft.workingBranch,
        base: draft.baseBranch,
      }));
    const publishedDraft: Draft = { ...draft, pullRequest };
    await this.draftStore.save(publishedDraft);

    return {
      draft: publishedDraft,
      pullRequest,
      outcome: existing ? "reconciled" : "created",
    };
  }

  private async ensureWorkingBranch(
    draft: Draft,
    input: SaveDraftInput,
  ): Promise<Draft & { workingBranch: string }> {
    if (!draft.workingBranch) {
      const workingBranch = createWorkingBranchName({
        authorLogin: input.authorLogin,
        articleSlug: input.articleSlug,
        suffix: input.branchSuffix,
      });
      const plannedDraft = { ...draft, workingBranch };

      // Persist the intended branch before the remote mutation so a retry can reconcile it.
      await this.draftStore.save(plannedDraft);
      await this.repository.createWorkingBranch(
        workingBranch,
        draft.baseCommitSha,
      );
      return plannedDraft;
    }

    try {
      await this.repository.getBranchHead(draft.workingBranch);
    } catch (error) {
      if (!(error instanceof SakkaError) || error.category !== "not_found") {
        throw error;
      }

      await this.repository.createWorkingBranch(
        draft.workingBranch,
        draft.baseCommitSha,
      );
    }

    return draft as Draft & { workingBranch: string };
  }

  private async requireDraft(id: string): Promise<Draft> {
    const draft = await this.draftStore.get(id);
    if (!draft) {
      throw new SakkaError({
        category: "not_found",
        message: "This Sakka draft could not be found.",
      });
    }
    return draft;
  }

  private assertOpenedVersionMatchesDraft(
    draft: Draft,
    openedVersion: ContentVersion,
  ): void {
    const expectedBranch = draft.workingBranch ?? draft.baseBranch;
    if (
      openedVersion.path !== draft.path ||
      openedVersion.branch !== expectedBranch
    ) {
      throw new SakkaError({
        category: "validation",
        message: "Sakka cannot save this content version to the current draft.",
      });
    }
  }
}
