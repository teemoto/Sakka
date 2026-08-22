# ADR 0003: Use source-first editing for MVP content fidelity

**Status:** Accepted  
**Date:** 2026-08-22

## Context

Sakka's core promise is that Git remains the authoritative content source. An edit must not silently rewrite or discard source the author did not intend to change.

The Aslam Bhai dogfood repository contains MDX articles with top-level imports, Astro component tags, and raw HTML. A generic Markdown/MDX AST round trip has not been proven safe for that source.

The frontmatter fidelity spike found that common YAML/frontmatter serializers retained unknown values semantically but reformatted unrelated source. A simple title change could alter quoting, whitespace, comments, or indentation in unknown fields. By contrast, using YAML only to locate an existing scalar's source range and replacing that range preserved every untouched frontmatter byte and the entire MDX body.

## Decision

The MVP will use a **source-first editing model**.

- The original repository file source is the editor's authoritative representation.
- Markdown bodies are edited and saved as source text. Sakka must not parse and reserialize them through a rich-text document model.
- MDX bodies are opaque source in the MVP. Sakka does not claim general MDX body editing or rich MDX preview support.
- Structured frontmatter controls are allowed only for explicitly supported, existing scalar fields when Sakka can patch exactly the scalar's source range.
- All untouched frontmatter and body source must remain byte-for-byte unchanged by a structured scalar edit.
- Unknown frontmatter fields, comments, nested objects, lists, aliases, custom tags, and unsupported syntax must never be rewritten by a structured edit.
- If a field is unsupported, missing, non-scalar, malformed, or ambiguous, Sakka must fall back to source editing rather than serialize the document.
- New Markdown articles may be created from a Sakka-controlled valid template. Later edits follow the same source-first rules.

The MVP may offer a Sakka-owned Markdown preview of source text. It must clearly be presented as a content preview, not a guarantee of the managed site's rendered output.

## Alternatives considered

### Generic frontmatter parse and serialize

**Rejected.** The spike proved that `gray-matter` and a YAML document serializer retain unknown values but rewrite unrelated source. Semantic preservation does not meet Sakka's source-fidelity requirement.

### Rich-text/AST editor with Markdown or MDX serialization

**Deferred.** It may eventually create a more guided editing experience, but it has not demonstrated safe round-trip behavior for the dogfood MDX corpus. Selecting it now would make source corruption an architectural risk.

### Read-only unsupported content

**Rejected for Markdown.** Source-first editing lets an author edit Markdown safely without Sakka claiming syntactic understanding it does not have. MDX body support remains explicitly limited rather than silently transformed.

### Treat all frontmatter as a structured form

**Rejected.** Site-specific frontmatter evolves. A form that serializes the entire mapping would rewrite unknown keys and produce noisy Git diffs. Only narrow source-range patches are permitted in the MVP.

## Consequences

### Positive

- Git diffs reflect the author's intended source change rather than serializer churn.
- Unknown frontmatter and unsupported MDX constructs survive untouched.
- The first editor can be small: a source editor plus Markdown preview, without a complex rich-text model.
- The MVP can dogfood against real content without claiming unsupported MDX fidelity.

### Costs and obligations

- The initial authoring experience is source-oriented rather than a full visual rich-text CMS.
- Structured frontmatter controls need source-range-aware parsing and careful scalar encoding, not a generic YAML stringify call.
- Unsupported frontmatter must produce an understandable fallback state instead of partial automated edits.
- The preview must handle source safely and document known differences from the managed site.
- Source-range patching needs regression fixtures for comments, quotes, nested unknown fields, line endings, and malformed YAML.

### Explicitly not decided here

- Editor component/library, split-view UX, syntax highlighting, or keyboard behavior.
- Full Markdown AST transformation or rich-text editing.
- MDX body editing, MDX preview, or preservation of arbitrary MDX transformations.
- A complete YAML CST patcher for arrays, objects, additions, removals, aliases, custom tags, or duplicate keys.
- The exact initial set of supported scalar frontmatter fields.

## Follow-up work

1. Define the initial Markdown source editor and preview feature set.
2. Define supported scalar frontmatter fields and source-range patch behavior.
3. Add regression fixtures for unknown frontmatter and unsupported MDX source.
4. Decide stale-write detection before implementing saves.
5. Revisit rich-text and MDX editing only after a corpus-based round-trip strategy proves source fidelity.

## Evidence

- [Markdown and frontmatter fidelity spike](../../research/markdown-frontmatter-fidelity-spike.md)
- [Aslam Bhai content contract](../../research/aslambhai-content-contract.md)

