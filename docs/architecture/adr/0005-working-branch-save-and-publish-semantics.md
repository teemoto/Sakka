# ADR 0005: Use one working branch per article with explicit save and draft-PR publishing

**Status:** Accepted  
**Date:** 2026-08-23

## Context

Sakka needs a Git-native way for an author to save unfinished work and then publish it through GitHub review. The MVP is owner-only, source-first, and must preserve human Git attribution. It also needs safe recovery when a content save succeeds but pull-request creation does not.

The GitHub workflow spikes proved that a GitHub App user token can create human-attributed commits and draft pull requests. The publish-recovery spike proved that a successful content commit survives a later PR-creation failure: the same branch can be reconciled into a draft PR without repeating the save.

During the first dogfood vertical slice, the configured publishing base must be a dedicated non-production branch. Sakka must not target the production branch until that workflow is explicitly proven and promoted.

## Decision

The MVP uses **one server-generated working branch per article editing session**, with explicit saves and explicit draft-PR publishing.

### Base and working branches

- Sakka configuration supplies exactly one publishing base branch.
- During dogfood, that base branch is the dedicated non-production branch `sakka/dogfood`. It is deployment configuration, not browser-controlled input.
- When an author opens an article, Sakka records the base branch, its tip commit SHA, and the article's file SHA.
- On the first changed explicit save, Sakka creates a server-generated working branch from the recorded base commit. A branch name includes a Sakka prefix, a normalized authenticated-author identifier, a normalized article slug, and a collision-resistant suffix.
- The branch belongs to that one article/editing session. Sakka does not share a working branch across articles in the MVP.

### Saving

- Save is an explicit author action; the MVP has no autosave.
- Before writing, Sakka serializes source according to ADR 0003 and compares it with the source already on the working branch. If unchanged, it creates no commit.
- Every changed successful save creates one human-attributed Git commit on the working branch.
- Each write uses the captured file SHA for that branch, following ADR 0004. A stale `409` blocks the save; Sakka does not automatically retry or merge.

### Publishing and recovery

- Publish is an explicit author action, separate from Save.
- Publish first reconciles: Sakka queries GitHub for an existing open pull request with the working branch as head and the configured base branch as base.
- If one exists, Sakka returns that PR rather than creating another.
- If none exists, Sakka creates one draft pull request from the working branch to the configured base branch.
- If PR creation fails after a successful save, Sakka retains and reports the working branch and its last commit. A later Publish retries reconciliation before attempting PR creation; it must not create a duplicate content commit.
- Sakka keeps the working branch after PR creation or merge. Initial cleanup is manual and visible through GitHub; automatic branch deletion is deferred.

### Minimal durable operation state

The server records only the operation metadata needed for recovery: configured repository and base branch, working branch, article path, base commit, current file SHA, last successful commit SHA, and PR number/URL when present. GitHub remains the authority for content and Git history.

## Alternatives considered

### Shared branch for all drafts

**Rejected for the MVP.** It mixes unrelated articles, makes one PR contain multiple authoring efforts, and complicates recovery and stale-write reasoning.

### One branch per author

**Deferred.** It may suit a later collaborator workflow, but an owner's unrelated articles would still share commits and PR state. The current evidence favors a smaller, independently recoverable unit.

### Save directly to the configured base branch

**Rejected.** It bypasses the pull-request boundary and makes a partially completed authoring action more dangerous. It also conflicts with the dedicated non-production dogfood requirement.

### Autosave every edit

**Deferred.** It would create noisy Git history and requires more decisions about debouncing, commit grouping, stale conflicts, and recovery. Explicit saves make the first Git behavior observable.

### Create a PR on first save

**Rejected.** The author should be able to save unfinished work without immediately creating a review object. Publish remains a deliberate action.

### Delete the branch automatically after merge

**Deferred.** GitHub may offer repository-level cleanup, but Sakka will not make deletion a hidden post-publish side effect in the MVP.

## Consequences

### Positive

- Each article's draft has a clear Git boundary, independent history, and recoverable branch.
- Saves, commits, and PR creation are visible, intentional author actions.
- No-op saves avoid meaningless Git history.
- PR-creation failures are reconcilable without losing content or creating duplicate commits.
- The dogfood integration cannot target production until its base-branch configuration is deliberately changed.

### Costs and obligations

- The application needs durable session/operation metadata and a reconciliation query before publishing.
- Authors may accumulate branches; the MVP needs clear branch/PR status even though cleanup is manual.
- The UI must distinguish unsaved changes, saved working-branch commits, a stale conflict, and a published draft PR.
- A new editing session for an article must locate or deliberately create its matching working branch; its exact resume UX needs implementation design.
- The configured base branch must be provisioned and kept current for dogfood before application testing begins.

## Explicitly not decided here

- The promotion process from `sakka/dogfood` to `main`.
- Resume, abandon, or branch-cleanup UX beyond manual GitHub cleanup.
- Autosave, batch/multi-file saves, and cross-article PRs.
- Automatic PR merge, post-merge deployment status, or review/check UI.
- Collaborator branch ownership and multi-user draft sharing.

## Follow-up work

1. Keep `sakka/dogfood` current as the dedicated non-production base branch before integrated application tests.
2. Define the persisted operation/session model and typed GitHub adapter errors.
3. Test branch-name collision, changed base branch, no-op save, lost PR-response, and duplicate-PR reconciliation behavior.
4. Implement the smallest vertical slice: list one article, edit source, explicit save, then create/reconcile a draft PR.
5. Revisit the base branch only after dogfood evidence supports a deliberate move to `main`.

## Evidence

- [GitHub App user-access-token spike](../../research/github-app-user-access-token-spike.md)
- [GitHub publish recovery spike](../../research/github-publish-recovery-spike.md)
- [Stale-write detection ADR](0004-stale-write-detection-and-conflict-response.md)
- [Source-first content fidelity ADR](0003-source-first-content-fidelity.md)
