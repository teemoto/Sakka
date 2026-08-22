# Markdown and frontmatter fidelity spike

**Date:** 2026-08-22  
**Status:** Completed experiment; editor/fidelity decision still requires approval

## Question

Can Sakka edit supported frontmatter while preserving unknown frontmatter and unsupported MDX source without accidental rewrite?

## Inputs

The experiment used:

1. a controlled Markdown fixture containing Sakka's known article fields plus unknown fields, nested objects, a list, and a YAML comment; and
2. the real Aslam Bhai article `working-with-ai-as-a-software-developer.mdx`, which contains top-level imports, Astro component tags, and raw HTML.

The controlled fixture included unknown frontmatter such as:

```yaml
tags:
  - frontend
customSeo:
  canonical: https://example.com/hello
hero:
  image: /images/hello.png
experimentalFlag: true
```

The temporary local experiment used `gray-matter` 4.0.3, `yaml` 2.9.0, and `@mdx-js/mdx` 3.1.1. It is not application code and was not added to the repository.

## Experiments and results

| Experiment | Result |
| --- | --- |
| Parse and reserialize the fixture with `gray-matter` after changing a known field | Unknown frontmatter values survived semantically, but unrelated frontmatter formatting changed. |
| Parse a YAML document and call its serializer after changing known fields | Unknown values survived semantically, but unrelated frontmatter was still reformatted. |
| Parse YAML only to locate an existing known scalar's source range, then replace that range in the original source | Only the intended scalar value changed; unknown frontmatter, comments, nested values, list indentation, and Markdown body remained byte-for-byte unchanged. |
| Compile the real MDX article | The MDX compiler accepted it, but compilation is a one-way transform to JavaScript rather than a safe source round trip. |
| Apply the same source-range title patch to the real MDX article | Only the known title value changed; the entire MDX body remained byte-for-byte unchanged, including imports and component tags. |

## Evidence

The controlled assertion suite proved:

```text
unknown frontmatter semantics preserved:             yes
Markdown body byte-for-byte preserved:               yes
generic YAML/frontmatter source byte-for-byte stable: no
source-patched scalar changes only target range:     yes

real MDX body preserved when frontmatter title changes: yes
real MDX contains imports and component tags:          yes
```

## Finding

Semantic preservation is not enough for Sakka's fidelity requirement.

Both frontmatter serializers retained unknown data, but they reformatted unrelated source. That can erase comments, alter quoting or whitespace conventions, and create noisy Git diffs even when Sakka changes only a title.

A safer narrow technique is to treat the original source as authoritative, parse it only to locate an existing supported scalar field, and replace only that field's source range. This preserves every untouched byte.

## Recommendation for the MVP

Adopt a **source-first editing model**:

- Store and display the original file source as the authoritative editor representation.
- Treat Markdown and MDX bodies as opaque source for the first slice; do not parse and serialize them through a rich-text document model.
- Permit structured frontmatter controls only for explicitly supported, existing scalar fields when Sakka can make a targeted source-range patch.
- For frontmatter additions, removals, arrays, objects, comments, aliases, or unsupported YAML syntax, fall back to source editing rather than reserializing the document.
- New Sakka-created Markdown articles may be generated from a controlled template, but later edits still use source-first preservation.
- Do not claim general MDX editing. Frontmatter-only scalar updates to MDX are technically possible under this strategy, but body editing remains out of scope until an MDX round-trip strategy is separately proven.

## What remains unproven

- A complete YAML CST patcher for every supported field type and edge case.
- Error handling and author UX for invalid frontmatter.
- Frontmatter aliases, multiline scalars, flow collections, custom YAML tags, duplicate keys, and unusual line endings.
- Source-first editor UX, Markdown preview pipeline, and cursor/selection behavior.
- Safe rich-text or MDX body editing.

## Decision required

Content fidelity affects Sakka's editor architecture and needs an ADR before application implementation begins. The ADR should define source-first representation, structured-control limits, normalization guarantees, and unsupported-content behavior.

