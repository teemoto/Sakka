# GitHub stale-write detection spike

**Status:** Complete  
**Date:** 2026-08-23  
**Repository:** `teemoto/aslambhai` (disposable branch only)

## Question

Can Sakka prevent an author who opened an older version of a file from overwriting a newer GitHub commit?

## Method

The spike used a temporary branch and a disposable Markdown fixture.

1. Create the fixture at version A and read it through GitHub's Contents API.
2. Record the returned file `sha`: `f0335a7fe550993c2e426a69f6f5f1abf739e93b`.
3. Simulate another writer updating the same path to version B using that SHA.
4. Attempt to save the author's A-prime version while still supplying the SHA for A.
5. Read the final file and remove the temporary branch.

The GitHub App installation token was used only to run the disposable repository experiment. No token or private key was printed, persisted, or committed.

## Result

The concurrent update to version B succeeded. The stale A-prime update was rejected with HTTP `409 Conflict`:

```text
src/content/articles/sakka-stale-write-spike.md does not match f0335a7fe550993c2e426a69f6f5f1abf739e93b
```

The final read confirmed that version B remained intact. The temporary branch was deleted successfully.

## Finding

For a GitHub Contents API update, the file `sha` is an optimistic-concurrency token, not merely metadata. Sakka can capture it when an author opens a file and provide it on save. If GitHub returns `409`, Sakka knows that the file changed after the author opened it and must not retry the stale write automatically.

## Implication for the MVP

The evidence supports a conservative conflict response:

1. Capture the exact branch and file SHA at open time.
2. Include the captured SHA in every update request.
3. On `409`, create no automatic replacement commit and do not attempt an automatic merge.
4. Fetch the current source and explain that the file changed; let the author reload or preserve/copy their unsaved source before continuing.

Automatic three-way merging and a dedicated merge UI remain later work. They need separate design because Sakka's source-first fidelity guarantee makes a silent source transformation unsafe.

## Limitations and next checks

- This proves a single-file race on one branch, not multi-file atomic saves.
- The production implementation must verify this behavior using the selected GitHub App user token and its own error mapping.
- Branch creation races, duplicate save recovery, and publish reconciliation remain separate experiments.

