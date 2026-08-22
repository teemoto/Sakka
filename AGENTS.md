# Sakka AI Working Agreement

This repository is being built as part of a learning-through-shipping engineering program.

AI agents are collaborators, accelerators, reviewers, researchers, and implementation partners.

They are not substitutes for engineering judgment.

## Project purpose

Sakka is an open-source, Git-native CMS for developer-owned content sites.

Its goal is to provide authors with a modern CMS editing experience while preserving Git as the source of truth for:

* content
* version history
* collaboration
* publishing workflows

The initial product wedge is deliberately narrow:

* GitHub-hosted repositories
* Markdown and constrained MDX
* static or content-driven websites
* an authenticated `/admin` experience
* Git-based drafts
* pull-request publishing

The first production dogfood site is Aslam Bhai (www.tanviraslam.com).

---

# Working principles

## 1. Learning over speed

Do not optimize solely for producing code quickly.

When a task involves an unfamiliar or consequential engineering concept, help the engineer understand the problem before hiding it behind an implementation.

## 2. Do not silently make architectural decisions

Major decisions involving architecture, security, data models, content fidelity, Git semantics, authentication, publishing, or extensibility must be surfaced explicitly.

Do not choose a library or architectural pattern simply because it is convenient.

## 3. Separate thinking from mechanical implementation

For consequential problems, follow this sequence:

1. State the problem.
2. Identify constraints.
3. Identify important unknowns.
4. Explain relevant concepts.
5. Present viable alternatives.
6. Compare tradeoffs.
7. Recommend a direction.
8. Let the engineer understand and challenge the recommendation.
9. Record the decision when appropriate.
10. Implement.

Once a direction is established, use AI aggressively for mechanical work.

Examples:

* boilerplate
* refactoring
* test generation
* repetitive code
* debugging assistance
* documentation updates
* migration scripts
* code review
* research assistance

## 4. Prefer evidence over speculation

Sakka should be shaped by real publishing workflows.

The project should be dogfooded early.

When possible:

```text
real pain
  ↓
small solution
  ↓
dogfood
  ↓
observe
  ↓
improve
```

Avoid designing generalized systems for hypothetical consumers.

## 5. Git is durable project memory

Important project knowledge should not live only in AI conversations.

When a meaningful decision is made, update the appropriate repository documentation.

Use:

```text
docs/
  PRD.md
  architecture/
  adr/
  research/
  weekly/
  launch/
  retrospective/
```

Only create documents when they contain useful information.

Do not create empty process artifacts.

## Build journal

Maintain the local, uncommitted build journal at `docs/BUILD_JOURNAL.md`. It is source material for a future public account of building Sakka, not canonical project documentation.

After every meaningful task, experiment, or decision, assess whether it produced a reusable learning, a meaningful surprise, or a rationale worth preserving. If so, add a concise journal entry and tell the engineer that it was added.

Do not record routine mechanics, duplicate the PRD or ADRs, or include credentials or other sensitive operational information.

---

# Current product decisions

Treat the following as decided unless the PRD is intentionally changed.

## Product

* Sakka is open source.
* Sakka is a Git-native CMS.
* Git remains the authoritative content store.
* The initial target is developer-owned content sites.
* The first production user is the Aslam Bhai site.
* The first integration target is GitHub.
* Markdown is a first-class format.
* MDX support must prioritize content fidelity.

## Authoring

The product should eventually expose an authenticated `/admin` interface where authors can:

* view existing content
* create content
* edit content
* preview content
* save drafts
* publish content

## Publishing

The initial publishing model should integrate with GitHub.

Pull requests are the preferred initial publishing workflow.

The exact draft branch strategy remains an architectural decision.

## Version history

Sakka should leverage Git history rather than introduce a proprietary revision system unless a strong future requirement justifies one.

## Extensibility

Sakka should eventually support multiple frameworks and repository layouts.

Do not build a generalized plugin system before the core workflow is proven.

---

# Important unresolved questions

Do not assume answers to the following.

These require investigation and, where appropriate, an ADR.

## Application architecture

* standalone application vs embedded application
* server runtime requirements
* deployment model
* repository/package structure

## GitHub integration

* GitHub App
* OAuth
* PAT/token-based models
* required permissions
* repository installation flow

## Authentication and authorization

* Sakka authentication model
* identity relationship with GitHub
* repository permissions
* author vs administrator roles

## Editor

* editor library
* editor document model
* rich-text vs source editing relationship
* supported Markdown constructs

## MDX

* parsing strategy
* AST representation
* round-trip fidelity
* unknown component preservation
* unsupported syntax behavior

## Drafts

* branch-per-draft
* shared draft branch
* local/server draft state
* autosave semantics

## Concurrency

* SHA-based version detection
* optimistic concurrency
* merge conflicts
* conflict resolution UX

## Preview

* editor preview
* framework preview
* deployment previews
* GitHub/Vercel/Cloudflare integrations

## Assets

* repository storage
* external object storage
* asset path conventions
* optimization responsibilities

## Repository discovery

* configuration file
* convention-based discovery
* frontmatter schema
* content directory detection

## Packaging

* single application
* monorepo
* core library
* CLI
* adapters

---

# Decision protocol

Create an ADR when a decision:

* changes architecture
* constrains future integrations
* affects security
* affects content fidelity
* establishes an important API
* changes data/storage semantics
* introduces significant operational complexity
* would be difficult to reverse

A useful ADR should contain:

```text
Context
Decision
Alternatives considered
Tradeoffs
Consequences
```

Do not create ADRs for trivial implementation details.

---

# Coding expectations

When implementation begins:

* Prefer TypeScript unless there is a strong reason otherwise.
* Favor explicit, small interfaces.
* Prefer boring solutions where novelty provides no value.
* Avoid dependencies that do not justify their maintenance cost.
* Keep core logic separate from provider-specific integrations where practical.
* Treat content preservation as a correctness requirement.
* Treat Git writes and publishing actions as high-risk operations.
* Fail safely.
* Make errors actionable to authors.
* Add tests around behavior and important invariants.
* Avoid tests coupled to implementation trivia.
* Prefer incremental PRs.

## Git workflow

Sakka currently has a single developer. Unless the engineer explicitly requests a branch or pull request, commit and push completed work directly to `main`.

Revisit this workflow when additional contributors begin working on the repository.

---

# Definition of a useful increment

A useful increment should ideally:

* work end to end
* be demonstrable
* test an important assumption
* record the important decision or learning
* include appropriate automated tests
* reveal the next meaningful gap

A vertical slice is usually preferable to a broad unfinished layer.

For example:

```text
Good:

authenticate
  ↓
load one Markdown file
  ↓
edit title
  ↓
commit to test branch
```

is preferable early on to:

```text
complete auth framework
complete editor framework
complete plugin framework
complete Git abstraction
```

without an end-to-end working path.

---

# How to work with the engineer

If asked to implement something and its architecture is still unresolved:

Do not immediately generate a large implementation.

First identify the decision that needs to be made.

If the task is mechanical and the direction has already been established:

Proceed efficiently.

If evidence contradicts an existing assumption:

Say so clearly.

Update documentation rather than preserving stale decisions for consistency.

The goal is not merely to produce Sakka.

The goal is to build Sakka while developing the engineering understanding required to design and operate systems like it.
