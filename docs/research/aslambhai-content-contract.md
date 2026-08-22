# Aslam Bhai Content Contract

**Status:** Phase 0 discovery complete
**Inspected:** 2026-08-21
**Repository:** teemoto/aslambhai
**Purpose:** Define the safe, real repository target for Sakka's first GitHub workflow spike.

## Repository and deployment

- The repository is public and its default branch is main.
- It is a static Astro site. The current package manifest declares Astro 5, MDX support, and Node 22.13 or later; the GitHub Pages workflow currently runs Node 24.
- The deployment workflow runs only when main is pushed. A push to another branch does not trigger the deploy workflow.
- The deployment workflow runs source checks, tests, and an Astro build before deploying to GitHub Pages.
- The canonical published domain is tanviraslam.com.

## MVP content target

The first supported content type is articles.

- Content directory: src/content/articles
- Supported repository extensions: .md and .mdx
- Astro collection: articles
- Current live content files: three .mdx articles
- Current article routing and home-page listing exclude entries whose draft frontmatter field is true.

The article schema currently requires:

- title: string
- description: string
- publishedAt: date
- minutes: positive integer
- topic: string
- icon: one of code, ai, data, leadership, megaphone, globe, or other

Optional schema fields are:

- cover: an object with src and alt strings
- featured: boolean, default false
- draft: boolean, default false

## Content-fidelity finding

Existing articles are not safe first-edit targets for a Markdown-only Sakka slice.

The inspected MDX article contains top-level imports and Astro component tags. This confirms the PRD requirement: Sakka must not attempt to parse, edit, or serialize existing MDX content until its preservation strategy is proven.

The first spike will operate on a newly created Markdown fixture instead.

## Safe test target

A dedicated branch has been created from the main commit inspected during Phase 0:

- Working branch: sakka/spike-github-write
- Base branch: main
- Base commit: 921a5511bbd48300e760cf410d243748968537bc
- Deployment effect: none, because the deployment workflow is limited to pushes to main

The first write experiment should create this disposable file on that branch:

~~~md
src/content/articles/sakka-github-spike.md
~~~

Its fixture content must provide every required schema field and set draft: true. This keeps the item out of generated article routes and listings if it is ever built, while still exercising the real content collection.

Do not edit an existing article and do not merge the spike pull request.

## First spike acceptance criteria

The local, disposable GitHub credential spike must prove the following sequence against the safe branch:

1. Read the fixture path or verify that it does not yet exist.
2. Read main and working-branch commit identifiers.
3. Create the Markdown fixture with valid frontmatter and draft: true.
4. Commit the change to sakka/spike-github-write.
5. Open a pull request targeting main.
6. Verify the PR source, target, commit identity, and changed path.
7. Close the PR and delete the working branch after evidence is captured.

## Rollback

Before any commit exists, deleting the working branch fully removes the Phase 0 test target.

After the spike begins:

1. Close the spike pull request without merging it.
2. Delete sakka/spike-github-write.
3. Confirm that main did not change and GitHub Pages did not deploy a new revision.

## Open follow-up

The GitHub connector could read repository metadata but received a 403 when asked to create a branch. Creating the same branch through the local Git credential succeeded.

This is evidence that credential and permission behavior must be investigated explicitly in the GitHub integration spike. It is not a production authentication decision.
