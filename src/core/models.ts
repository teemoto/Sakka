import type { SakkaErrorCategory } from "@/core/errors";

export type RepositoryCoordinates = {
  owner: string;
  repository: string;
};

export type SakkaConfiguration = {
  repository: RepositoryCoordinates;
  baseBranch: string;
  contentDirectory: string;
  contentExtensions: readonly string[];
  supportedFrontmatterFields: readonly string[];
};

export type ContentKind = "markdown" | "mdx";

export type ContentItem = {
  path: string;
  filename: string;
  slug: string;
  kind: ContentKind;
  title?: string;
  sourceStatus: "supported" | "source_only" | "malformed";
};

export type ContentVersion = {
  path: string;
  branch: string;
  source: string;
  fileSha: string;
  baseCommitSha?: string;
};

export type PullRequestReference = {
  number: number;
  url: string;
  state: "open" | "closed";
};

export type Draft = {
  id: string;
  path: string;
  baseBranch: string;
  baseCommitSha: string;
  workingBranch?: string;
  currentFileSha?: string;
  lastCommitSha?: string;
  pullRequest?: PullRequestReference;
};

export type SaveResult = {
  draft: Draft;
  commitCreated: boolean;
  fileSha: string;
  commitSha?: string;
};

export type PublishResult = {
  draft: Draft;
  pullRequest: PullRequestReference;
  outcome: "created" | "reconciled";
};

export type OperationAuditEntry = {
  id: string;
  actorId: string;
  action: "save" | "publish";
  outcome: "succeeded" | "failed";
  errorCategory?: SakkaErrorCategory;
  correlationId: string;
  createdAt: Date;
};
