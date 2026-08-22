# Sakka Product Requirements Document

**Status:** Draft
**Phase:** Product definition / pre-implementation
**License:** Apache-2.0

---

# 1. Product summary

Sakka is an open-source, Git-native CMS for developer-owned content sites.

It provides authors with a modern content-management experience while keeping Git as the source of truth for content, version history, collaboration, and publishing.

Sakka is initially targeted at developers who prefer static or Git-backed content sites but want a better authoring workflow than manually editing files and committing them.

The initial product wedge is:

```text
GitHub
+
Markdown / constrained MDX
+
developer-owned content sites
```

The first production dogfood application will be the Aslam Bhai publishing site.

---

# 2. Problem

Git-based publishing has attractive engineering properties.

Content is:

* portable
* versioned
* reviewable
* inspectable
* framework-independent
* owned by the developer
* compatible with existing deployment systems

A typical workflow looks like:

```text
write Markdown
  ↓
add metadata
  ↓
manage images
  ↓
commit
  ↓
push
  ↓
open/merge PR
  ↓
deploy
```

For developers this can be perfectly acceptable.

For authors, occasional contributors, and even developers who want a smoother publishing experience, the workflow creates unnecessary friction.

Traditional CMS platforms solve the authoring problem but frequently introduce a second content store:

```text
CMS database
  ↓
API
  ↓
website
```

This changes the architecture fundamentally.

The CMS becomes authoritative.

Sakka explores a different model:

```text
CMS experience
  ↓
Git operations
  ↓
existing repository
```

The author receives a CMS interface.

The developer keeps Git.

---

# 3. Product thesis

The central thesis is:

> A content site should not need to surrender Git ownership in order to gain a good authoring experience.

Sakka should behave as a user-friendly control plane over an existing Git-based content workflow rather than replacing it.

---

# 4. Goals

## 4.1 Primary goals

Sakka should allow an authenticated author to:

* discover existing content
* create new content
* edit existing content
* edit metadata/frontmatter
* use a friendly writing experience
* preview changes
* save drafts
* resume drafts
* publish through GitHub
* preserve Git history
* detect conflicting edits
* recover from publishing failures

## 4.2 Engineering goals

Sakka should:

* preserve content fidelity
* integrate with existing repositories rather than own content
* avoid requiring a proprietary content database for source content
* remain inspectable and portable
* minimize framework coupling
* provide strong failure recovery
* allow future provider/framework integrations

## 4.3 Learning goals

The project should provide practical experience with:

* Git internals and GitHub APIs
* authentication and authorization
* editor architecture
* parsing and ASTs
* Markdown/MDX transformation
* conflict detection
* concurrency
* content pipelines
* extensible system design
* developer tooling
* observability
* OSS product development

---

# 5. Non-goals

The initial versions of Sakka are not intended to compete directly with:

* WordPress
* Contentful
* Sanity
* Notion
* enterprise DAM systems
* large editorial workflow platforms

The MVP does not need:

* advanced enterprise RBAC
* localization workflows
* complex approval chains
* arbitrary database-backed content types
* visual page builders
* marketplace-style plugin ecosystems
* multi-cloud deployment orchestration
* real-time collaborative editing
* analytics dashboards
* built-in site hosting
* built-in static-site generation

These may be revisited only if real users demonstrate a need.

---

# 6. Target users

## 6.1 Primary user

A developer who owns a Git-backed content site.

Examples:

* personal technical blog
* documentation website
* OSS project site
* small publication
* portfolio
* static marketing site

The developer wants:

* Git ownership
* portability
* version history
* existing deployment workflows
* low infrastructure overhead

but also wants a better authoring experience.

## 6.2 Secondary user

An author who should be able to publish without needing to understand:

* Git commands
* branch management
* Markdown syntax
* repository structure
* pull-request mechanics

The author should experience:

```text
open admin
  ↓
write
  ↓
preview
  ↓
publish
```

while Sakka translates those actions into Git operations.

---

# 7. Initial user journey

## 7.1 Site administrator

The administrator connects Sakka to a GitHub repository.

Sakka identifies or is configured with:

* repository
* content directory
* supported file types
* frontmatter schema
* default publishing branch
* optional preview behavior

## 7.2 Author

The author opens:

```text
/admin
```

and authenticates.

They see content such as:

```text
Articles

Published
Drafts
```

The author selects an existing article or creates a new one.

They edit:

* title
* metadata
* article body
* images/assets

They preview the result.

They save a draft.

When ready, they select Publish.

Sakka performs the GitHub publishing workflow.

The initial expected model is:

```text
author
  ↓
Sakka
  ↓
draft branch
  ↓
GitHub Pull Request
  ↓
merge
  ↓
existing deployment system
```

The exact draft branch model is still open.

---

# 8. Functional requirements

## 8.1 Authentication

**Status: DECIDED at product level, architecture OPEN**

The admin interface must require authentication.

The authentication design must eventually support secure repository access.

Open architecture questions include:

* GitHub OAuth
* GitHub App identity
* independent Sakka identity
* provider-specific authentication

---

## 8.2 Repository integration

**Status: DECIDED for GitHub-first**

The first supported source-control provider will be GitHub.

Sakka must be able to perform the Git operations necessary for:

* reading files
* reading metadata
* creating branches
* modifying content
* committing changes
* creating pull requests
* checking version state

Sakka should request the smallest practical permission scope.

---

## 8.3 Content discovery

**Status: REQUIRED, exact design OPEN**

Sakka needs to understand where content exists.

Possible inputs include:

* explicit configuration
* conventions
* framework adapters
* content schemas

The MVP may begin with explicit configuration instead of automatic discovery.

---

## 8.4 Content listing

**Status: REQUIRED**

The author should be able to see existing content.

At minimum:

* title
* publication state
* file location or derived identifier
* modified state

Possible later metadata:

* publication date
* tags
* author
* draft owner
* Git status

---

## 8.5 Content creation

**Status: REQUIRED**

An author should be able to create a new content item.

Sakka should generate a valid repository file using the configured content model.

This may include:

* filename
* slug
* frontmatter
* body
* asset paths

---

## 8.6 Content editing

**Status: REQUIRED**

An author should be able to edit existing Markdown content.

For MDX, Sakka must not silently corrupt constructs it cannot represent.

Content fidelity is a correctness requirement.

---

## 8.7 Editor

**Status: REQUIRED, technology OPEN**

The authoring experience should provide a friendly editor.

Potential modes include:

* rich text
* Markdown source
* split view
* preview

The editor architecture must be evaluated separately from the product requirement.

---

## 8.8 Frontmatter / metadata

**Status: REQUIRED**

Authors should be able to edit configured metadata fields.

Examples:

```yaml
title:
description:
publishedAt:
tags:
author:
draft:
```

Sakka should not assume every site has the same schema.

---

## 8.9 Preview

**Status: REQUIRED, architecture OPEN**

Authors need confidence that content will render correctly before publishing.

For the initial MVP, Sakka-owned Markdown preview is sufficient. Rendering content through the site's actual renderer is a stretch goal and should not block proving the core authoring-to-pull-request workflow.

Possible preview levels include:

### Level 1

Sakka-owned content preview.

### Level 2

Preview using the site's actual renderer.

### Level 3

Deployment preview through an external hosting platform.

MVP scope should be chosen after architecture investigation.

---

## 8.10 Drafts

**Status: REQUIRED, storage model OPEN**

Authors must be able to save unfinished work.

The preferred principle is:

> Draft content should remain compatible with Git ownership.

Possible strategies:

* branch per draft
* branch per author
* shared drafts branch
* temporary Sakka storage plus later Git persistence

The initial design should favor Git-native drafts if practical.

---

## 8.11 Publishing

**Status: DECIDED conceptually**

The initial publishing workflow should create a GitHub pull request.

Possible flow:

```text
draft
  ↓
commit
  ↓
branch
  ↓
pull request
  ↓
review / checks
  ↓
merge
  ↓
deploy
```

Direct-to-main publishing may be considered later as an optional configuration.

### Author attribution

**Status: DECIDED product requirement, implementation OPEN**

Sakka must retain the initiating author for every publishing action.

For the owner-only MVP, a shared GitHub App identity is acceptable when the repository owner is the only possible author. Once collaborator support is introduced, Git-visible commit metadata and pull-request context must identify the individual author; a shared bot identity alone is not sufficient.

The exact mechanism—such as GitHub App user access tokens, commit author/committer metadata, or both—requires an ADR.

---

## 8.12 Editing published content

**Status: REQUIRED**

Existing published files must be editable.

The resulting changes should flow through the same Git-based publishing process.

---

## 8.13 Revision history

**Status: DECIDED principle**

Sakka should surface Git history rather than duplicate it in a proprietary revision system.

Future UI may expose:

* previous revisions
* author
* timestamp
* commit message
* diff

---

## 8.14 Conflict detection

**Status: REQUIRED**

Sakka must detect when content has changed since the author began editing.

At minimum, the system should avoid blindly overwriting newer content.

Potential mechanisms include:

* blob SHA
* commit SHA
* ETag-style version identifier
* compare-before-write

Conflict resolution UX is an open design question.

---

## 8.15 Media/assets

**Status: REQUIRED eventually, MVP depth OPEN**

Authors should eventually be able to add images and other content assets.

Potential storage strategies include:

* repository assets
* existing site asset directories
* external object storage
* configurable providers

The initial implementation should align with Git ownership unless real constraints suggest otherwise.

---

# 9. Content fidelity requirements

This is one of the most important technical requirements.

Consider an MDX file:

```mdx
---
title: My Article
---

# Hello

Some text.

<InteractiveDiagram mode="advanced" />

More text.
```

If the Sakka editor does not understand:

```mdx
<InteractiveDiagram mode="advanced" />
```

it must not silently remove or rewrite it incorrectly.

Valid outcomes include:

* preserve the construct
* display it as an opaque block
* require source mode
* mark the file partially unsupported

Invalid outcome:

* silently corrupt the source

This requirement should heavily influence editor and AST architecture.

---

# 10. Architecture principles

These are principles, not implementation choices.

## Git is authoritative

Sakka should not require content to be imported into a proprietary database before it can be edited.

## Provider boundaries

GitHub-specific concerns should not unnecessarily leak into core content logic.

## Framework boundaries

Astro may be the first dogfood target.

Sakka should avoid making Astro concepts foundational unless unavoidable.

## Reversibility

Early architectural choices should favor the ability to learn and change direction.

## Content preservation

Unknown syntax should be preserved whenever possible.

## Safe mutations

Writes to Git repositories should be explicit, observable, and recoverable.

---

# 11. Initial MVP

The MVP should prove the central thesis rather than demonstrate feature breadth.

A successful first vertical slice could be:

```text
Authenticate
  ↓
Connect configured GitHub repository
  ↓
List Markdown articles
  ↓
Open one article
  ↓
Edit title/body
  ↓
Save to a branch
  ↓
Create pull request
```

This is more valuable than independently completing large subsystems without an end-to-end path.

## MVP requirements

* the Aslam Bhai GitHub repository as the first dogfood target
* use a dedicated test branch until the workflow is proven; do not mutate production content during early investigation
* one configured content directory
* Markdown support
* simple frontmatter
* authenticated admin for the repository owner only
* list existing articles
* edit existing article
* create article
* save through Git
* create PR
* Sakka-owned Markdown preview
* basic errors
* basic conflict protection

## Possible MVP exclusions

* full MDX editing
* arbitrary framework support
* site-rendered and deployment preview infrastructure
* external asset providers
* sophisticated RBAC
* collaborative editing
* plugin framework
* multi-repository management

These exclusions should be revisited after the first technical spikes.

---

# 12. Early technical investigations

Before committing to the application architecture, run focused spikes around the highest-risk areas.

## Spike 1: GitHub write workflow

Prove:

```text
read file
  ↓
get SHA
  ↓
create branch
  ↓
modify file
  ↓
commit
  ↓
create PR
```

Questions:

* GitHub App or OAuth?
* permissions?
* rate limits?
* token lifecycle?
* private repositories?

---

## Spike 2: Markdown round trip

Test:

```text
Markdown source
  ↓
parse
  ↓
editor representation
  ↓
serialize
  ↓
Markdown source
```

Compare original and generated content.

Determine acceptable normalization.

---

## Spike 3: MDX preservation

Test files containing:

* JSX components
* imports
* expressions
* code blocks
* custom directives
* frontmatter

Determine what Sakka can safely edit.

---

## Spike 4: Editor architecture

Evaluate whether candidate editor models support:

* Markdown
* source fidelity
* custom blocks
* schema evolution
* serialization
* large documents
* extensibility

Do not choose solely based on editor UX.

---

## Spike 5: Conflict detection

Simulate:

```text
Author opens version A

Another user commits version B

Author tries to save A'
```

Ensure Sakka detects the stale base.

---

# 13. Open architecture questions

The following are intentionally unresolved.

## Runtime

* Next.js?
* standalone Node server?
* framework-neutral core?
* client/server split?
* serverless?

## Repository structure

* single application?
* monorepo?
* packages?

Possible future shape:

```text
@sakka/core
@sakka/github
@sakka/editor
@sakka/astro
@sakka/cli
```

This is not yet a decision.

## Editor

Candidates should be evaluated based on product requirements.

## Authentication

Must be threat-modeled before implementation.

## GitHub integration

GitHub App vs OAuth requires investigation.

## Preview system

Needs a staged design.

## Plugin model

Defer until at least two genuine integrations demonstrate the abstraction required.

---

# 14. Non-functional requirements

## Reliability

A failed publish should not lose an author's work.

## Security

Sakka will interact with source repositories and therefore must treat credentials and write permissions as sensitive.

## Observability

Important workflows should produce enough structured information to debug failures.

Examples:

* authentication failure
* repository access failure
* parsing failure
* conflict detection
* branch creation failure
* commit failure
* PR creation failure

## Performance

The admin UI should feel responsive for normal content repositories.

Performance optimization should follow measurements rather than premature design.

## Accessibility

The authoring interface should aim for accessible interactions and semantic UI patterns.

## Maintainability

Prefer explicit modules and small abstractions over generalized infrastructure.

---

# 15. Success criteria

The project has proven the initial thesis when a real user can:

```text
open Sakka
  ↓
authenticate
  ↓
write/edit article
  ↓
preview it
  ↓
publish it
  ↓
see a GitHub PR
  ↓
merge it
  ↓
see the existing website deploy
```

without manually editing repository files or using Git commands.

---

# 16. Dogfooding strategy

The first real integration is the Aslam Bhai publishing site.

Sakka development should therefore follow this loop:

```text
Publishing pain
  ↓
Document problem
  ↓
Build smallest useful solution
  ↓
Use it on Aslam Bhai
  ↓
Observe friction
  ↓
Improve
```

Additional early testers should be introduced after the core workflow works for the first site.

Their differences should help reveal which abstractions are actually needed.

---

# 17. Open-source strategy

Sakka should be developed publicly.

Useful public artifacts may eventually include:

* roadmap
* architecture documentation
* ADRs
* GitHub issues
* contribution guide
* release notes
* technical articles
* integration guides

Community infrastructure should grow with actual community activity.

Do not build elaborate governance before there are contributors to govern.

---

# 18. Proposed repository documentation

As the project grows:

```text
README.md
AGENTS.md

docs/
  PRD.md

  architecture/
    overview.md

  adr/
    0001-example.md

  research/
    github-integration.md
    mdx-round-trip.md

  weekly/
    2026-xx-xx.md

  launch/
    checklist.md

  retrospective/
```

This structure is aspirational.

Directories should be created only when needed.

---

# 19. Decision status summary

## DECIDED

* Name: Sakka
* Open source
* Apache-2.0
* Git-native content model
* Git is source of truth
* GitHub-first
* developer-owned content sites
* authenticated admin experience
* create/edit/publish workflows
* pull-request publishing as initial model
* individual author attribution for collaborative publishing
* Git revision history
* dogfood on Aslam Bhai
* content fidelity as a first-class requirement

## PROPOSED

* Astro as first framework integration
* constrained MDX support
* Git-native draft branches
* explicit repository configuration for MVP
* TypeScript implementation
* future adapter/package architecture

## OPEN

* application framework
* runtime architecture
* editor library
* MDX AST strategy
* authentication model
* GitHub App vs OAuth
* draft branch semantics
* preview architecture
* conflict resolution UX
* asset model
* package/monorepo structure
* CLI
* plugin architecture

---

# 20. Immediate next step

Do not scaffold the full application yet.

The next phase should be:

```text
PRD
  ↓
identify highest-risk assumptions
  ↓
run focused technical spikes
  ↓
record findings
  ↓
choose architecture
  ↓
ADR
  ↓
build first vertical slice
```

The first recommended engineering investigation is the GitHub read/write/pull-request workflow because it validates the central Git-native publishing model on which the rest of Sakka depends.
