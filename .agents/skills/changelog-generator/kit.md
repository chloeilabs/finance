---
schema: kit/1.0
owner: matt-clawd
slug: changelog-generator
title: Changelog & Release Notes Generator
summary: >-
  Generates human-readable changelogs and release notes from git history, PR
  descriptions, and linked issues.
version: 1.0.1
license: MIT
tags:
  - changelog
  - release-notes
  - git
  - developer-tools
  - automation
model:
  provider: anthropic
  name: claude-sonnet-4-20250514
  hosting: cloud API — requires ANTHROPIC_API_KEY
tools:
  - git
  - gh-cli
  - github-api
skills:
  - commit-analysis
  - technical-writing
tech:
  - git
  - github
services:
  - name: GitHub
    kind: api-service
    role: 'PR descriptions, linked issues, and release creation'
    setup: >-
      Authenticate the GitHub CLI (gh auth login). Needs read access to PRs,
      issues, and commits.
parameters:
  - name: format
    value: keep-a-changelog
    description: 'Output format (keep-a-changelog, conventional, narrative, or custom).'
  - name: group_by
    value: category
    description: 'How to group entries (category, scope, author, or component).'
  - name: include_breaking
    value: 'true'
    description: Highlight breaking changes in a dedicated section.
  - name: audience
    value: users
    description: >-
      Target audience (users, developers, or both). Controls the level of
      technical detail.
failures:
  - problem: >-
      Commits with messages like "fix" or "wip" produced nonsensical changelog
      entries.
    resolution: >-
      For low-quality commit messages, fetch the associated PR description and
      linked issues to reconstruct what actually changed. Fall back to diff
      analysis for orphan commits.
    scope: general
  - problem: >-
      Merge commits and squash commits were double-counted, inflating the
      changelog with duplicate entries.
    resolution: >-
      Deduplicate by tracking PR numbers — when a merge commit references a PR,
      use the PR as the canonical source and skip the individual commits it
      contains.
    scope: general
  - problem: >-
      Automated dependency update commits (Dependabot, Renovate) dominated the
      changelog with noise.
    resolution: >-
      Detect bot-authored commits by committer name and consolidate them into a
      single "Dependencies updated" entry with a count, rather than listing each
      bump individually.
    scope: general
inputs:
  - name: Version range
    description: >-
      Git ref range for the changelog (e.g., v1.2.0..HEAD, or
      last-release..HEAD). Defaults to changes since the last tag.
  - name: Previous changelog
    description: Optional existing CHANGELOG.md to prepend the new entries to.
outputs:
  - name: Changelog entries
    description: Formatted changelog content ready to prepend to CHANGELOG.md.
  - name: Release notes
    description: >-
      Release notes formatted for GitHub Releases with highlights and
      contributor acknowledgments.
  - name: Breaking changes summary
    description: Dedicated section listing breaking changes with migration guidance.
fileManifest:
  - path: types.ts
    role: types
    description: Shared TypeScript type definitions for changelog generation
  - path: config.ts
    role: configuration
    description: Configuration loader from environment variables
  - path: commits.ts
    role: parser
    description: Git log parser with PR number extraction and tag discovery
  - path: enrich.ts
    role: enricher
    description: PR enrichment via GitHub CLI with bot detection and dedup
  - path: classify.ts
    role: classifier
    description: Change classification using PR labels and Claude analysis
  - path: format.ts
    role: formatter
    description: 'Multi-format changelog output (Keep a Changelog, Conventional, Narrative)'
  - path: breaking.ts
    role: analyzer
    description: Breaking change detection and migration guide generation
  - path: contributors.ts
    role: utility
    description: Contributor list builder from commits and PRs
prerequisites:
  - name: git
    check: git --version
  - name: GitHub CLI
    check: gh --version
dependencies:
  runtime:
    node: '>=20.0.0'
  npm:
    tsx: '>=4.0.0'
    '@anthropic-ai/sdk': ^0.52.0
  cli:
    - git
    - gh
  secrets:
    - ANTHROPIC_API_KEY
    - GITHUB_TOKEN
verification:
  command: >-
    npx tsx -e "import * as c from './src/commits.ts'; console.log('Commits
    module loaded:', typeof c.getCommits)"
  expected: 'Commits module loaded: function'
selfContained: true
requiredResources:
  - resourceId: github-api
    kind: api-service
    required: true
    purpose: GitHub API for repository data
    deliveryMethod: connection
environment:
  runtime: node
  os: 'macos, linux, windows'
  adaptationNotes: >-
    Works with any git hosting that provides PR descriptions. GitHub integration
    is richest; GitLab and Bitbucket work with commit-only mode.
---

## Goal

Generate polished, human-readable changelogs and release notes from git
history by intelligently combining commit messages, PR descriptions, and linked
issues. The agent understands Conventional Commits, handles messy commit
histories gracefully, and produces audience-appropriate output — technical
detail for developers, user-facing summaries for end users.

## When to Use

- You are preparing a release and need a changelog but the commit history is
  a mix of useful messages and "fix typo" noise.
- Your team does not follow Conventional Commits consistently, and you need a
  tool that works with messy history.
- You want to automatically create GitHub Release notes when tagging a new
  version.
- You need to separate user-facing changes from internal refactoring in the
  release notes.

## Setup

### Models

- Verified with `anthropic/claude-sonnet-4-20250514` (cloud API — requires
  `ANTHROPIC_API_KEY`) for commit analysis, PR summarization, and changelog
  writing. Sonnet handles large diff sets and produces well-structured
  prose.

### Services

- **GitHub** via `gh` CLI: provides PR descriptions, linked issues, commit
  metadata, and release creation. Read access to the repository is
  sufficient.

### Parameters

- `format`: `keep-a-changelog` — follows the Keep a Changelog convention with
  Added, Changed, Deprecated, Removed, Fixed, Security sections. Use
  `conventional` for Conventional Commits grouping or `narrative` for
  prose-style release notes.
- `group_by`: `category` — group entries by change type. Use `scope` for
  component-based grouping or `author` for contributor-based grouping.
- `include_breaking`: `true` — dedicate a section to breaking changes with
  migration steps.
- `audience`: `users` — focus on user-visible impact. Use `developers` for
  internal releases.

### Environment

- git CLI and GitHub CLI (`gh`) authenticated.
- `ANTHROPIC_API_KEY` environment variable.
- `GITHUB_REPO` or `GITHUB_REPOSITORY` set to `owner/repo` if you want emitted
  changelog entries to include PR links.
- Must be run inside a git repository.

## Steps

1. Determine the version range. If no range is specified, find the latest git
   tag and use `{latest-tag}..HEAD`. If no tags exist, use all commits.

2. Fetch the commit log for the version range with full messages, author info,
   and commit hashes.

3. For each commit, check if it is associated with a merged PR:
   - Use `gh pr list --search {commit-hash}` or parse PR references from
     commit messages.
   - If a PR is found, fetch the PR description, labels, and linked issues.
   - Merge commits: use the PR as the canonical source, skip the constituent
     commits.

4. Identify and handle special commit types:
   - **Bot commits** (Dependabot, Renovate): consolidate into a single
     "Dependencies updated" entry with a count.
   - **Revert commits**: pair with the original commit and present as a
     revert.
   - **WIP / fixup commits**: merge with their parent PR or skip if orphaned.

5. Classify each change into categories:
   - **Added**: new features, capabilities, endpoints
   - **Changed**: modifications to existing behavior
   - **Deprecated**: features marked for future removal
   - **Removed**: deleted features or functionality
   - **Fixed**: bug fixes
   - **Security**: vulnerability patches
   - **Breaking**: changes that require user action

   Use PR labels first (e.g., `enhancement`, `bug`, `breaking-change`). Fall
   back to commit message analysis and diff content when labels are absent.

6. For each change entry, write a human-readable description:
   - For `users` audience: describe the user-visible impact without
     implementation details.
   - For `developers` audience: include component names, API changes, and
     technical context.
   - Reference the PR number and link.

7. For breaking changes, generate migration guidance:
   - What specifically changed
   - What the user needs to do
   - Code examples of the old and new approach

8. Assemble the changelog:
   - Version header with date
   - Breaking changes section (if any)
   - Change entries grouped by the configured `group_by` strategy
   - Contributors list with GitHub usernames
   - Full changelog diff link

9. If a previous CHANGELOG.md is provided, prepend the new entries below the
   header.

10. Optionally create a GitHub Release with the release notes using
    `gh release create`.

## Failures Overcome

- Uninformative commit messages like "fix" or "wip" produced useless entries.
  Fixed by falling back to PR descriptions, linked issues, and diff analysis.
- Merge and squash commits were double-counted. Fixed by deduplicating via
  PR number tracking.
- Dependabot/Renovate noise dominated the changelog. Fixed by detecting bot
  commits and consolidating them into a single summary entry.

## Validation

- Run against a repository with a known set of changes and verify the
  changelog accurately reflects the work done.
- Create a test commit with a "fix" message and verify the agent recovers
  context from the associated PR description.
- Verify that bot dependency commits are consolidated into one entry.
- Confirm that breaking changes appear in a dedicated section with migration
  guidance.
- Validate the output format matches the selected convention.

## Constraints

- PR-based enrichment requires the repository to use pull requests.
  Repositories with direct commits to main will have less context available.
- Conventional Commits parsing works best when the team follows the convention
  consistently.
- Very long version ranges (1000+ commits) may need to be processed in batches
  due to context limits.
- Private repository access requires appropriate GitHub CLI authentication.

## Safety Notes

- Do not include commit hashes or internal infrastructure details in
  user-facing release notes.
- Review generated breaking change migration guides for accuracy before
  publishing — incorrect migration steps can cause user issues.
- Changelog entries should not expose security vulnerability details until
  patches are deployed.
- Respect contributor privacy — do not include email addresses in the
  contributors list, only GitHub usernames.
