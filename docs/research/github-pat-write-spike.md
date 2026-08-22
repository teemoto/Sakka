# GitHub PAT Write Workflow Spike

**Status:** Complete
**Date:** 2026-08-22
**Scope:** Disposable local experiment against teemoto/aslambhai
**Decision status:** Evidence only; not a production authentication decision

## Question

Can a narrowly scoped fine-grained personal access token perform Sakka's core GitHub mutation path safely enough to validate the Git-native publishing thesis?

## Test setup

- Token type: fine-grained personal access token
- Resource owner: teemoto
- Repository access: only teemoto/aslambhai
- Repository permissions:
  - Contents: read and write
  - Pull requests: read and write
- Base branch: main
- Disposable branch prefix: sakka/spike-pat-
- Disposable fixture path: src/content/articles/sakka-github-spike.md
- Fixture state: draft: true
- Deployment safety: the site's GitHub Pages workflow runs only on pushes to main

The token was loaded only into the engineer's interactive terminal. It was not committed, printed, stored in the Sakka repository, or made available to the agent environment.

## Observed workflow

All intended GitHub REST operations succeeded:

1. Read authenticated identity: GET /user returned the expected login, teemoto.
2. Read repository metadata: default branch was main.
3. Read the main branch ref.
4. Read an existing MDX article and captured its blob SHA.
5. Created a unique branch from the captured main commit.
6. Created a new Markdown fixture on that branch through the Contents API.
7. Created a draft pull request targeting main.
8. Read the resulting PR and file through the GitHub connector.
9. Closed the PR through the Pulls API.
10. Deleted the temporary branch through the Git References API.

The created PR had exactly one changed file, was draft and unmerged, targeted main, and contained a valid article fixture with draft: true.

## Evidence

- Base commit: 52110bd88a15d7d00f211a82db108a16b3f6cc6d
- Read file blob SHA: 30c4ef92d542da84695a150e6c8cbac66736de14
- Temporary branch: sakka/spike-pat-20260822174652-11407c75
- Commit created by the Contents API: 3270a2454786e509c4b148f1fb47b385695d56d6
- Draft PR: #2
- Cleanup result: PR closed; temporary branch deleted; local state removed

## What this proves

- GitHub can support Sakka's essential read → branch → write → pull-request workflow.
- A fine-grained PAT restricted to one repository and the tested permissions can perform that workflow.
- A branch-based write flow prevents a test write from reaching main or triggering the site's deployment workflow.
- The Contents API returns a commit result and GitHub exposes the branch and pull-request objects Sakka will need to surface.

## What this does not prove

- A PAT is suitable for Sakka's production authentication model.
- GitHub App and OAuth tradeoffs.
- Token refresh, revocation, multi-user authorization, or repository-installation flow.
- Safe no-op write detection.
- Stale-write detection and conflict handling.
- Recovery after a failed commit or failed PR creation.
- Markdown editing/serialization fidelity beyond creating a controlled fixture.

## Important observation

The connected GitHub app could read repository data but received a 403 when asked to create a branch. The fine-grained PAT could create the branch with the tested repository permissions.

This demonstrates that credentials and permission boundaries materially affect Sakka's capabilities. The eventual authentication and runtime design must be selected through an ADR; this spike must not be treated as selecting PATs for production.

## Next decision-focused work

Before application scaffolding:

1. Compare GitHub App and OAuth against the now-proven PAT baseline.
2. Extend the threat model to cover owner-only authentication, credential storage, revocation, and browser/server trust boundaries.
3. Write the GitHub credential and repository-access ADR.
