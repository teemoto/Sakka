# ADR 0006: Use a narrow Sakka core with one GitHub repository adapter

**Status:** Accepted  
**Date:** 2026-08-23

## Context

The MVP needs to turn the accepted source-first, stale-write, and working-branch decisions into an application without coupling every route and UI component directly to GitHub REST response shapes.

Sakka will initially support one configured GitHub repository and one configured content directory. It should leave room for a later provider without building a generalized plugin system or a speculative multi-provider abstraction.

The application also needs enough durable metadata to resume and reconcile a save/publish operation. That metadata must not turn Postgres into a second content store; GitHub and Git remain authoritative for content, commits, branches, and pull requests.

## Decision

The MVP will use a **narrow application core** and a single **GitHub repository adapter**.

```text
Admin UI and route handlers
            ↓
        Sakka core
  validation, workflow, state,
       domain models/errors
            ↓
   Repository gateway interface
            ↓
       GitHub adapter
            ↓
        GitHub REST API
```

### Sakka core

The core owns provider-independent product rules:

- configuration validation for one repository, base branch, content directory, supported extensions, and explicitly supported frontmatter fields;
- content-path and generated-branch validation;
- source-first serialization and no-op comparison rules;
- the working-branch/save/publish/reconciliation workflow from ADRs 0003–0005;
- domain models and typed errors exposed to the UI; and
- the minimal durable draft-operation and audit records.

The core must not expose GitHub REST response objects to the UI.

### Repository gateway and GitHub adapter

The core calls a small repository gateway that can:

- verify the configured repository and base branch;
- list configured content paths and read a file's source/version;
- create a working branch from an explicit base commit;
- conditionally write one file using its expected version SHA;
- find or create a draft pull request for explicit head/base branches; and
- return normalized repository data or a typed Sakka error.

The GitHub adapter owns token-authenticated GitHub calls, GitHub-specific request/response mapping, pagination details, and translation of GitHub failures. It receives credentials only from trusted server code; browser code never calls it with a GitHub token.

This interface is deliberately small and shaped by the MVP workflow. It is not a public plugin API or an abstraction for providers that do not yet exist.

### Models and errors

The core uses provider-neutral models with at least these fields:

| Model | Required information |
| --- | --- |
| `ContentItem` | repository-relative path, filename/slug, supported type, list metadata, and source status |
| `ContentVersion` | path, branch, source text, file SHA, and base commit SHA when opened from a base branch |
| `Draft` | draft ID, article path, base branch/commit, working branch, current file SHA, last commit SHA, and PR reference when present |
| `SaveResult` | draft/working branch, whether a commit was created, file SHA, and commit SHA when changed |
| `PublishResult` | draft/working branch, PR number/URL/state, and whether it was created or reconciled |
| `SakkaError` | stable category, safe author-facing message, optional retryability, and a correlation ID |

The stable UI-visible error categories are: `unauthenticated`, `unauthorized`, `misconfigured`, `not_found`, `validation`, `conflict`, `rate_limited`, and `transient`. Unknown provider failures map to `transient` with a safe correlation ID; raw provider payloads, tokens, and content are never shown or logged by default.

### Durable state and audit data

Postgres may retain opaque session/OAuth state and the minimum operation context needed to resume a draft: configured repository identity, content path, base branch/commit, working branch, current file SHA, last successful commit SHA, and PR number/URL. It may retain actor ID, action kind, timestamps, outcome/error category, and correlation ID for audit/recovery.

Postgres must not retain repository source text as an authoritative copy, GitHub bearer tokens in plaintext, raw provider error bodies, or full content diffs in routine audit records.

### Test responsibilities

- **Unit tests:** configuration, paths, branch names, source/no-op rules, state transitions, and error mapping contracts.
- **GitHub adapter integration tests:** disposable-branch GitHub behavior, including conditional writes, PR reconciliation, and normalized failure mapping.
- **Browser end-to-end tests:** protected admin access and the author journey through list, edit, preview, save, stale conflict, and publish against a safe target.

## Alternatives considered

### Call GitHub directly from route handlers and UI actions

**Rejected.** It would spread provider behavior and security checks across the application, make error handling inconsistent, and make a later provider boundary harder to introduce safely.

### Build a generic plugin SDK or multi-provider layer now

**Rejected.** There is only one real provider and workflow. A narrow gateway preserves an extraction point without designing for hypothetical adapters.

### Store editable content and revisions in Postgres

**Rejected.** It duplicates Git's authority and undermines the product's inspectable Git-native model. The database has only session and operation-recovery responsibilities.

### Expose raw GitHub errors to authors

**Rejected.** They may contain implementation details, are not stable UI contracts, and do not tell an author what action is safe to take.

## Consequences

### Positive

- UI behavior is shaped by Sakka product concepts rather than GitHub payloads.
- GitHub remains replaceable at the boundary without prematurely committing to provider plugins.
- Error handling, audit context, and recovery become consistent across routes.
- Tests can isolate workflow rules from live GitHub behavior.

### Costs and obligations

- The initial implementation needs explicit mapping code instead of passing API payloads through unchanged.
- The gateway should remain small; adding a method requires evidence from a real workflow.
- Operation metadata needs migration, retention, and privacy decisions during implementation.
- The GitHub adapter still requires disposable live integration coverage because mocks cannot prove provider semantics.

## Explicitly not decided here

- Public package boundaries, monorepo layout, or a plugin SDK.
- The exact database schema, ORM, migration tool, encryption library, or session library.
- The initial editor component and Markdown preview renderer.
- Multi-repository configuration, collaborator roles, webhooks, and background sync.

## Follow-up work

1. Scaffold the standalone strict-TypeScript Next.js application and its test tooling.
2. Add validated configuration and the core model/interface definitions before any GitHub route implementation.
3. Choose concrete database, session, and migration libraries only when implementation requires them.
4. Keep the first GitHub adapter integration tests restricted to disposable branches under `sakka/dogfood`.

## Evidence

- [GitHub credential ADR](0001-github-credential-and-repository-access.md)
- [Runtime ADR](0002-mvp-application-runtime-and-deployment.md)
- [Source-first fidelity ADR](0003-source-first-content-fidelity.md)
- [Stale-write ADR](0004-stale-write-detection-and-conflict-response.md)
- [Working-branch workflow ADR](0005-working-branch-save-and-publish-semantics.md)

