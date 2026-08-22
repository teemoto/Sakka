# GitHub App user-access-token spike

**Date:** 2026-08-22  
**Status:** Completed experiment; not a production-auth decision

## Question

Can a GitHub App user access token authenticate the repository owner, remain limited to the App's selected repository, perform Sakka's core Git workflow, and preserve human Git attribution?

## Why Device Flow for this experiment

GitHub Apps can issue user access tokens through either the web authorization-code flow or Device Flow. Device Flow is designed for a CLI or another process that cannot receive a browser callback:

```text
local Sakka process                 GitHub browser session
        │                                      │
        │ request one-time device code         │
        │───────────────► GitHub               │
        │                                      │
        │ show short user code                 │
        │────────► author enters code ────────►│
        │                                      │
        │ poll until author approves           │
        │◄────────── user access token ───────│
```

The author signs in and approves on GitHub's page; the local process never handles the GitHub password. Device Flow avoided creating an App client secret solely for this temporary experiment.

This proves user-token capability and attribution. It does **not** replace the future browser authorization-code-flow experiment for Sakka's `/admin` application, which must validate callback handling and CSRF `state` protection.

## Setup

- Existing private App: **Sakka Dogfood Spike**.
- Installation scope: only `teemoto/aslambhai`.
- Repository permissions: metadata read; contents read/write; pull requests read/write.
- Device Flow: enabled on the App specifically for this experiment.
- The App's expiring-user-token option remained enabled.
- No App private key or client secret was required to start Device Flow.
- The one-off script printed only GitHub's short user code. It did not print or persist the device code, user access token, or refresh token.

## Workflow proved

After `@teemoto` approved the one-time Device Flow code, the user token successfully:

1. authenticated the signed-in user with `GET /user`;
2. listed the user's App installations and repositories;
3. verified access to the App installation and to `teemoto/aslambhai`;
4. read the `main` SHA and an existing MDX article;
5. created a unique `sakka/spike-user-token-*` working branch;
6. created a temporary Markdown fixture and draft pull request; and
7. inspected the resulting commit, closed the draft PR, and deleted the working branch.

The temporary draft pull request was [#4](https://github.com/teemoto/aslambhai/pull/4). It was closed without merging; the branch and local state were removed.

## Attribution result

The resulting commit had this Git-visible attribution:

```text
Git author:    Tanvir Aslam
Git committer: Tanvir Aslam
GitHub author: @teemoto
GitHub committer: @teemoto
```

This differs materially from the installation-token spike, whose commit was authored by `sakka-dogfood-spike[bot]`. The GitHub App user token therefore proved the required human-attribution behavior for future collaboration.

The inspected commit was not GitHub-verified. That is an observed property to consider in the eventual commit-signing and audit design; it is not a blocker for the current product definition.

## What this supports

- A GitHub App user token is constrained by the intersection of the App's permissions, its installation scope, and the signed-in user's access.
- The token can provide both a GitHub identity and Git-visible human commit attribution.
- GitHub App user tokens are a viable candidate for Sakka's author-facing GitHub authorization flow.

## What this does not decide

- The `/admin` application's runtime, deployment, and browser callback URL.
- Session design, CSRF `state` validation, redirect validation, and logout/revocation behavior.
- Whether Device Flow should be enabled in the production App. It was useful for a local experiment, but the browser authorization-code flow better matches a web admin.
- Refresh-token storage, rotation, and revocation policy.
- Collaborator role rules, repository configuration, or the final working-branch model.

## Next evidence needed

1. Complete the authentication and authorization threat model.
2. Test the web authorization-code flow in the selected application runtime, including CSRF `state` and callback validation.
3. Make the GitHub credential and repository-access ADR, explicitly separating repository capability from human identity and attribution.

## References

- [Generating a user access token for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [Differences between GitHub Apps and OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps)
