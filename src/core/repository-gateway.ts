import type {
  ContentItem,
  ContentVersion,
  PullRequestReference,
} from "@/core/models";

export type BranchHead = {
  branch: string;
  commitSha: string;
};

export type FileWrite = {
  path: string;
  branch: string;
  source: string;
  expectedFileSha?: string;
  message: string;
};

export type FileWriteResult = {
  fileSha: string;
  commitSha: string;
};

export type DraftPullRequest = {
  title: string;
  body?: string;
  head: string;
  base: string;
};

export interface RepositoryGateway {
  getBranchHead(branch: string): Promise<BranchHead>;
  listContentItems(branch: string): Promise<ContentItem[]>;
  readContent(path: string, branch: string): Promise<ContentVersion>;
  createWorkingBranch(
    branch: string,
    baseCommitSha: string,
  ): Promise<BranchHead>;
  writeFile(write: FileWrite): Promise<FileWriteResult>;
  findOpenDraftPullRequest(
    head: string,
    base: string,
  ): Promise<PullRequestReference | undefined>;
  createDraftPullRequest(
    pullRequest: DraftPullRequest,
  ): Promise<PullRequestReference>;
}
