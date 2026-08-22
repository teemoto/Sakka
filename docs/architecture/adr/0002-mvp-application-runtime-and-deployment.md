# ADR 0002: Use a standalone Next.js application on Vercel Node with Neon Postgres for the MVP

**Status:** Accepted  
**Date:** 2026-08-22

## Context

Sakka needs an authenticated `/admin` application that can complete the GitHub App web authorization-code flow, hold GitHub credentials outside the browser, validate state-changing requests, and make GitHub mutations on behalf of the authenticated author.

ADR 0001 selected GitHub App user access tokens for author-initiated work. That decision requires durable server-side state for opaque browser sessions, one-time OAuth state, and encrypted refresh tokens. It does not require a proprietary database for site content: Git remains Sakka's authoritative content store.

The first dogfood deployment must be simple enough for one developer to operate without paid infrastructure. Sakka must also remain independent of the framework used by the sites it manages; Aslam Bhai's use of Astro is not a reason to embed Sakka in that site.

## Decision

For the MVP, Sakka will be a **standalone Next.js TypeScript application** deployed on **Vercel's Node.js runtime**, with **Neon Postgres Free** as its durable server-side store.

The MVP deployment model is:

```text
browser
  ↓ HTTPS + opaque session cookie
Sakka Next.js application (Vercel Node runtime)
  ↓ encrypted session/token records
Neon Postgres
  ↓ GitHub App user-token API calls
GitHub
```

The application will:

- use Next.js server routes for the GitHub callback and all GitHub mutations;
- use the Node.js runtime, not an Edge runtime, for predictable full Node.js compatibility during the first slice;
- store only authentication/session state, encrypted refresh tokens when retention is required, OAuth state, and minimal operation/audit metadata in Postgres;
- keep content source, history, and publishing state in GitHub/Git rather than duplicating content in Postgres;
- keep GitHub client secrets, encryption keys, and database credentials in Vercel server-side environment variables, never in browser bundles or Git;
- use an opaque secure cookie to identify the server-side session; and
- begin on Vercel Hobby, Neon Free, and the default `*.vercel.app` URL, with no custom domain, card-required service, or paid plan.

No application scaffold, Vercel project, Neon database, or production secret is created by this ADR. Those are implementation steps after the minimum application foundation is approved.

## Alternatives considered

### Astro SSR

**Not selected for the MVP.** Astro can support server rendering and sessions, but Sakka is a standalone admin product, not an extension of the Astro site it manages. Choosing Astro only because the dogfood site uses it would create unnecessary framework coupling. The MVP also benefits from the React-focused editor ecosystem available to a Next.js application.

### Cloudflare Workers

**Deferred.** Workers can securely store secrets and increasingly support Node.js APIs, but introduce Worker-specific bindings, compatibility behavior, and data-service decisions. That is valuable when edge deployment is a product need, but it adds learning surface unrelated to the first author-to-Git workflow.

### Self-hosted Node server or Docker deployment

**Deferred.** This gives greater operational control and remains a future portability option, but requires the developer to operate hosting, HTTPS, deployment, monitoring, and database connectivity before the MVP proves its authoring workflow.

### Client-side GitHub integration

**Rejected.** It would expose or complicate handling of GitHub credentials in an untrusted browser context and conflicts with ADR 0001 and the threat model.

## Consequences

### Positive

- One TypeScript application can provide the admin UI and trusted GitHub server boundary.
- Vercel's Node runtime supports ordinary Node.js libraries and server-side environment variables.
- Neon Postgres gives the MVP durable state without treating a CMS database as the content authority.
- The deployment requires no paid infrastructure for personal, non-commercial dogfooding within the current free-tier limits.
- Sakka remains independent of the framework and deployment setup of sites it manages.

### Costs and obligations

- Vercel Hobby is for personal, non-commercial use. Reassess hosting before commercial use, adding paid collaborators, or exceeding its free-tier limits.
- Neon Free has limited storage and scales down when inactive; this is appropriate for the owner-only MVP but not a production capacity guarantee.
- Session records and retained refresh tokens must be encrypted at rest. The encryption-key lifecycle is an implementation/security requirement.
- Serverless database access must use a serverless-compatible driver or pooled connection strategy.
- The GitHub App callback must be changed from localhost to the deployed exact HTTPS callback URL when deployment begins.
- Sakka must not rely on in-memory state for sessions, OAuth state, operation recovery, or refresh-token persistence.

### Explicitly not decided here

- Session library, ORM/query layer, database schema, token retention duration, and encryption implementation.
- Exact Vercel/Neon account setup, regions, spend controls, or deployment domain.
- Editor library, content model, working-branch semantics, stale-write behavior, and pull-request recovery.
- Production scaling, self-hosting support, or alternate hosting providers.

## Follow-up work

1. Create the approved Next.js foundation only after the core configuration, domain models, and GitHub adapter boundaries are defined.
2. Define the server-side session, OAuth state, token, and audit-record schema.
3. Configure Vercel and Neon only when an end-to-end authenticated vertical slice is ready to deploy.
4. Register the exact deployed GitHub App callback URL and keep callback wildcard matching disabled.
5. Reassess the deployment decision before commercial use or free-tier limits become a constraint.

## References

- [Next.js environment variables](https://nextjs.org/docs/app/guides/environment-variables)
- [Vercel Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Neon pricing](https://neon.com/pricing)

