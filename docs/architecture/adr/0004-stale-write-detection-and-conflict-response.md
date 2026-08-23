# ADR 0004: Detect stale writes with the GitHub file SHA and block automatic resolution

**Status:** Accepted  
**Date:** 2026-08-23

## Context

Sakka lets an author edit repository source that may change between opening a file and saving it. Git remains authoritative, so Sakka must not overwrite a newer GitHub version with stale source from the browser.

The stale-write spike created version A of a disposable Markdown fixture, captured its GitHub Contents file SHA, then wrote version B through a simulated concurrent writer. A subsequent save of A-prime using A's SHA received HTTP `409 Conflict`; version B remained intact.

ADR 0003 also requires source-first fidelity. That makes automatic source merging particularly risky: a merge that appears mechanically successful could still change source in a way Sakka has not proved safe for Markdown or MDX.

## Decision

The MVP will use **optimistic concurrency based on the GitHub Contents file SHA**.

- When an author opens a file, Sakka records the configured working branch and the file SHA returned for that exact path and branch.
- A save supplies the captured SHA to GitHub's Contents update request.
- A `409 Conflict` means the file changed since it was opened. Sakka must not automatically retry the stale write, create a replacement commit, or perform an automatic merge.
- On a conflict, Sakka preserves the author's unsaved source in the current browser session, fetches the current repository source and SHA, and explains that a newer version exists.
- The initial conflict UI offers an explicit reload path. It may also provide a safe way to copy the unsaved source, but does not claim to merge it.
- This protection applies to individual file saves. Multi-file atomic save semantics are not part of the MVP.

## Alternatives considered

### Last write wins

**Rejected.** It can overwrite a newer Git commit without the author noticing, violating Git-native reviewability and the PRD requirement to detect conflicting edits.

### Automatically retry after fetching the latest SHA

**Rejected.** Retrying the unchanged stale content with a newer SHA is merely last-write-wins under another name.

### Automatic three-way merge

**Deferred.** It could reduce friction later, but needs a separate design, clear author-facing conflict presentation, and source-fidelity evidence for Markdown and constrained MDX. It is unsafe to introduce implicitly.

### Use a commit SHA or application-managed revision number

**Not selected for the MVP.** A commit SHA is broader than the individual file being updated, while an application revision would duplicate Git's versioning. The Contents file SHA directly protects the object that is saved.

## Consequences

### Positive

- A stale editor cannot silently overwrite a newer version of the same file.
- Sakka relies on GitHub's object version rather than creating a proprietary revision store.
- The failure mode is clear and preserves the author's local unsaved text for deliberate recovery.
- The behavior is compatible with the source-first fidelity model.

### Costs and obligations

- Save requests and typed errors must retain enough context to distinguish a conflict from authentication, permission, validation, or network failures.
- The UI must make the conflict state actionable and avoid discarding unsaved source on reload/navigation.
- The GitHub adapter needs integration coverage for `409` mapping and for a successful save using the captured SHA.
- A later multi-file save or merge feature requires another decision rather than inheriting single-file behavior accidentally.

## Explicitly not decided here

- The working-branch model, autosave behavior, commit grouping, or pull-request publishing flow.
- A three-way merge algorithm, merge editor, or conflict-resolution UI.
- Cross-file transactional writes.
- Whether conflict recovery eventually persists an unsaved browser draft server-side.

## Follow-up work

1. Define working-branch, save, and publish semantics.
2. Define typed adapter and UI error categories.
3. Add adapter integration tests for success, stale `409`, and error mapping using the selected user-token credential.
4. Design a source-preserving conflict screen before adding any automatic merge behavior.

## Evidence

- [GitHub stale-write detection spike](../../research/github-stale-write-spike.md)
- [Source-first content fidelity ADR](0003-source-first-content-fidelity.md)

