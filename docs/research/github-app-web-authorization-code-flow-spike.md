# GitHub App web authorization-code-flow spike

**Date:** 2026-08-22  
**Status:** Completed happy-path experiment; not a production-auth decision

## Question

Can a local Sakka server safely complete GitHub App's browser authorization-code flow with a callback, PKCE, and a session-bound `state` value, then verify the signed-in user's access to the configured App installation and repository?

## Setup

The private **Sakka Dogfood Spike** GitHub App already had this exact local callback URL registered:

```text
http://localhost:3000/auth/github/callback
```

For this temporary local experiment:

- a GitHub App client secret was generated and entered only into the local shell environment;
- a one-off Node server listened only on `127.0.0.1:3000`;
- the server generated a high-entropy `state` value and PKCE verifier/challenge in memory;
- the authorization request included the exact `redirect_uri`, `state`, PKCE `S256` challenge, and the expected GitHub login;
- the callback accepted only `GET /auth/github/callback`; and
- the server exchanged the code server-side, verified the user and the installed repository, then closed.

The client secret, authorization code, access token, and refresh token were not printed, committed, or persisted.

## Workflow proved

```text
browser ── authorize GitHub App ──► exact localhost callback
                                          │
                            verify state + code + single use
                                          │
                            exchange code + PKCE verifier server-side
                                          │
                            GET /user and user-visible App installation/repos
                                          │
                                      close server
```

The completed callback established:

```json
{
  "authorizedUser": "teemoto",
  "installation": {
    "account": "teemoto"
  },
  "repository": "teemoto/aslambhai",
  "accessTokenExpiresInSeconds": 28800,
  "refreshTokenReturned": true,
  "tokenPrintedOrPersisted": false
}
```

The resulting token lifetime was eight hours. GitHub also returned a refresh token, confirming that any production implementation needs an explicit refresh-token storage, rotation, and revocation policy.

## Security behavior implemented in the spike

- Exact callback path; other paths returned `404`.
- High-entropy callback `state` with constant-time comparison.
- A missing or mismatched `state` was rejected before any code exchange.
- A missing code was rejected.
- The callback could be used only once after a valid state/code pair was accepted.
- PKCE `S256` was used for the authorization request and code exchange.
- The callback response used `Cache-Control: no-store`.
- The server checked the GitHub user, their accessible App installation, and the configured repository instead of trusting browser-supplied repository or installation identifiers.

## What this supports

- The web authorization-code flow is technically viable for Sakka's eventual browser `/admin` experience.
- GitHub App user tokens can provide the authenticated user identity and a repository-access intersection suitable for the owner-only MVP.
- PKCE and a server-owned `state` value fit naturally into the required callback-security model.

## What remains unproven

- Adversarial tests for missing, mismatched, expired, and reused state values.
- Production session design, cookie settings, CSRF protection on later write requests, logout, and user-token revocation.
- Production secret storage, rotation, and deletion of no-longer-needed App client secrets.
- Refresh-token encryption, rotation, and revocation policy.
- Unauthorized-user and unavailable-installation behavior.
- Write, stale-write, retry, and partial-failure behavior under a browser session.

## Cleanup note

The App now has client secret material created for this local experiment. After we decide whether another local authorization-code-flow test is needed, revoke unused client secrets from the GitHub App settings. Never commit or paste a client secret into chat.

## References

- [Generating a user access token for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [About the user authorization callback URL](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-user-authorization-callback-url)

