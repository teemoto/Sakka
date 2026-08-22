# Sakka

A Git-native CMS for developer-owned content sites.

Sakka aims to provide authors with the convenience of a modern CMS while keeping Git as the source of truth for content, history, and publishing.

The first target is deliberately narrow:

- GitHub-hosted repositories
- Markdown and constrained MDX content
- Static/content-driven sites
- An authenticated `/admin` authoring experience
- Git-based drafts and pull-request publishing

Sakka is being built in the open and dogfooded on a real publishing site before expanding into a broader ecosystem.

## Status

Early development.

The current focus is product definition, architecture, and proving the core authoring-to-Git workflow.

## Core idea

Traditional Git-based publishing works well for developers:

```text
Markdown
  ↓
Git
  ↓
Pull Request
  ↓
Deploy
```

But it is not always a good authoring experience.

Sakka adds a CMS interface without replacing the underlying Git workflow:

```text
Author
  ↓
Sakka
  ↓
GitHub
  ↓
Repository
  ↓
Existing deployment pipeline
```

Git remains authoritative.

## Initial goals

Sakka should eventually allow an authenticated author to:

- view existing content
- create and edit articles
- work in a friendly editor
- preview content
- save drafts
- publish through GitHub pull requests
- retain Git history and review workflows

## Principles

- Git is the source of truth.
- Content ownership stays with the site owner.
- Prefer simple, inspectable architecture.
- Preserve Markdown/MDX fidelity.
- Dogfood before generalizing.
- Build extensibility from real use cases, not speculation.
- Favor small end-to-end increments over large speculative builds.

## Documentation

The canonical product requirements live in:

`docs/PRD.md`

AI-assisted development guidelines live in:

`AGENTS.md`

Architecture decisions are recorded as ADRs in `docs/architecture/adr/`.

## License

Apache-2.0
