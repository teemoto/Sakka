# GitHub publish recovery spike

**Status:** Complete  
**Date:** 2026-08-23  
**Repository:** `teemoto/aslambhai` (disposable branch only)

## Question

If Sakka successfully saves content to a working branch but pull-request creation fails, can it reconcile the existing branch without losing the saved content or creating a duplicate commit?

## Method

The experiment used a GitHub App installation token only for a disposable repository operation. It did not print, persist, or commit credentials.

1. Read `main` and create a uniquely named temporary branch.
2. Create a disposable Markdown fixture on that branch through the Contents API.
3. Intentionally request a draft pull request with a nonexistent base branch.
4. Request a draft pull request again from the same existing branch to `main`.
5. Verify the resulting PR, then close it and delete the branch.

## Result

| Operation | Result |
| --- | --- |
| Create working branch | `201 Created` |
| Save fixture and create content commit | `201 Created` |
| Create PR with invalid base branch | `422 Validation Failed` |
| Create PR again from the same branch to `main` | `201 Created` |
| Read resulting draft PR | `200 OK` |
| Cleanup | PR closed; branch deleted (`204`) |

The content commit was `cac16b524f6b825b98d1b1c3604d7c78757c3553`. The recovered PR was [#5](https://github.com/teemoto/aslambhai/pull/5); it was closed unmerged during cleanup.

## Finding

Saving content and creating a pull request are separate, durable GitHub operations. A PR creation failure after a successful save does not roll back the branch or commit. The retained working branch is enough to retry/reconcile PR creation without repeating the content save.

## Implication for the MVP

The eventual save/publish workflow needs durable operation context that distinguishes:

- branch created;
- content commit created;
- draft PR created; and
- the associated branch, commit SHA, base branch, and PR number when present.

On a PR-creation failure after a successful save, Sakka must report that the saved branch still exists and offer an explicit retry/reconcile action. Before creating another PR, it should query for an existing open PR with the same head branch and configured base branch. It must not blindly create a new content commit.

## Limitations and follow-up

- The forced failure used an invalid base branch; it does not model every GitHub or network failure.
- The experiment did not prove idempotency for a request whose network response is lost after GitHub has created the PR.
- The production implementation must perform reconciliation using the selected GitHub App user token and persist minimal operation state without retaining content as a second authority.
- Branch naming, ownership, save grouping, and the final Publish UI still require an ADR.

