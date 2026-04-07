---
schema: kit/1.0
owner: citadel
slug: project-scaffold
title: Project-Aware Scaffold — New Files That Fit
summary: >-
  Reads your codebase, finds exemplars, generates new files matching your exact
  conventions, wires into every registration point. No generic templates.
version: 1.0.0
license: MIT
tags:
  - scaffolding
  - code-generation
  - conventions
  - developer-tools
  - boilerplate
model:
  provider: anthropic
  name: claude-sonnet-4-6
  hosting: Anthropic API (api.anthropic.com)
tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
tech:
  - typescript
  - javascript
  - react
failures:
  - problem: No exemplar files found for the requested type.
    resolution: >-
      Lists available file types in the codebase and asks which to use as the
      exemplar. Never generates from memory when no precedent exists.
    scope: general
  - problem: Target file or directory already exists.
    resolution: >-
      Asks for confirmation before overwriting. Does not silently clobber
      existing files.
    scope: general
  - problem: Typecheck fails after generation.
    resolution: >-
      Fixes the type errors before exiting. Does not leave the developer with
      broken generated files.
    scope: general
  - problem: No wiring point found for the generated file.
    resolution: >-
      Notes the missing registration point explicitly in output rather than
      silently leaving the file unwired.
    scope: general
useCases:
  - scenario: >-
      Adding a new component, service, hook, or module to an established
      project.
    constraints:
      - >-
        Project must have at least 2 existing files of the same type to use as
        exemplars
    notFor:
      - Files with no precedent in the project
      - Modifying existing files
  - scenario: >-
      Onboarding to a new codebase and adding a feature without deeply studying
      the conventions first.
    constraints: []
    notFor: []
  - scenario: >-
      Ensuring generated files are fully wired in — barrel exports, route
      registration, etc. — on first write.
    constraints: []
    notFor: []
inputs:
  - name: file_type
    description: >-
      Kind of file to generate: component, hook, service, route, module, domain,
      utility. If ambiguous, asks one clarifying question.
  - name: name
    description: >-
      What to call it. The kit infers correct casing (PascalCase, kebab-case,
      etc.) from existing codebase conventions.
  - name: description
    description: >-
      Optional: what the new file does. Used to generate meaningful internals
      rather than empty stubs.
outputs:
  - name: generated_files
    description: >-
      Main file, and optionally test file, types file, barrel update, story
      file, style file — whichever the project conventions call for.
  - name: wiring_summary
    description: >-
      List of registration points updated: barrel exports, route registrations,
      module registries, nav configs, etc.
  - name: conventions_source
    description: Paths to the exemplar files used as the convention reference.
selfContained: true
---

# Project-Aware Scaffold — New Files That Fit

## Goal

Every project has conventions. Some are documented; most are implicit — visible
in the patterns of the files that already exist. When you add a new file manually,
you internalize those patterns automatically. When a generic AI template generates
one, the patterns are wrong: wrong import style, wrong naming, wrong structure,
missing the test file, not wired into the barrel export.

This kit solves that by reading the codebase *before generating anything*. It finds
2-3 existing files of the same type as what you're creating — the project's own
exemplars — and replicates their exact patterns. Not "a React component pattern."
Your project's React component pattern.

It also handles wiring: finding every registration point the exemplars use (barrel
exports, route configs, module registries, navigation arrays, type unions) and
adding the new file to each one, in the exact format the project already uses.

The result: a file that passes code review as if a senior developer who knows this
codebase wrote it. Because it was written from that developer's prior work.

## When to Use

- Adding a new component, service, hook, route, module, or utility to an existing project
- Any time you want the generated file to match your conventions exactly
- When you're onboarding and want to add something without deeply studying the conventions first
- When you need the file wired in — not just created, but actually connected

**Don't use for:**
- Files with no precedent in the project (work with the user to establish the pattern first)
- Modifying existing files (just edit them directly)
- Projects with no established conventions yet

## Setup

No setup required. The kit reads conventions from your existing codebase.

One thing to have ready: know the type and name of what you want to create.
"A React component called UserProfile" or "a service for handling Stripe webhooks"
is enough context to start.

## Steps

### Step 1: Parse the Request

From the user's input, extract:
- **type**: component | hook | service | route | module | domain | utility | custom
- **name**: what to call it (the kit normalizes casing to match the project convention)
- **description**: what it does, if provided (makes internals more meaningful)

If the type is ambiguous, ask *one* clarifying question. Not a form — one question.

---

### Step 2: Find Exemplars

Search the codebase for 2-3 existing files of the same type. These are the
convention reference:

| Type | Where to Look |
|---|---|
| component | `**/*.tsx` in the same directory or sibling directories |
| hook | `**/hooks/**`, `**/use*.ts` |
| service | `**/services/**`, `**/lib/**` |
| route | Router config files, `**/routes.*`, `**/pages/**` |
| module/domain | Top-level feature directories |
| utility | `**/utils/**`, `**/helpers/**` |

**From each exemplar, extract:**
1. File naming convention (PascalCase? kebab-case? camelCase?)
2. Directory placement (co-located? separate directory?)
3. Import style (path aliases? relative? named or default exports?)
4. Export style (named exports? default? re-exported from barrel?)
5. Internal patterns (how state is managed, error handling, JSDoc or not)
6. Test co-location (`.test.ts` next to file? `__tests__/` directory?)
7. Types pattern (inline? separate `.types.ts`? shared types file?)

Before generating anything, output a 3-5 line summary of the conventions found.
This confirms the kit is working from the right patterns before writing files.

---

### Step 3: Determine the File Set

Based on the exemplars, determine which files to generate. Only generate what
the project's conventions call for:

| File | Generate if... |
|---|---|
| Main file | Always |
| Types file (`.types.ts`) | Project separates types for this type of file |
| Test file (`.test.ts`) | Project co-locates tests for this type of file |
| Barrel/index update | Project uses barrel exports and the directory has one |
| Style file | Project uses co-located styles for this type |
| Story file (`.stories.tsx`) | Project has Storybook stories for this type |

**Do not generate:**
- Empty placeholder files with only a stub comment
- Test files containing only empty `describe` / `it` stubs with no assertions
- Types files that only re-export from elsewhere
- Any file type the project doesn't already use

---

### Step 4: Generate Files

For each file in the set, adapt the closest exemplar:

1. Match the exemplar's structure exactly — same section order, same patterns
2. Replace names and specific logic, keep structural patterns
3. Every generated file must be syntactically valid and importable
4. No placeholder comments (`// implement me`, `// Add logic here`)
5. No empty function bodies unless the exemplar has them
6. Minimal but real — a component renders something, a service has at least one
   real method, a hook returns a typed value

**Specific rules by type:**

For components: match props pattern (interface vs. type, inline vs. separate),
state management pattern, utility imports (cn, clsx, etc.), and forwardRef/memo
usage if the exemplar uses them.

For services/modules: match initialization pattern (constructor vs. factory vs.
singleton), error handling (throw vs. Result type vs. callbacks), and async patterns.

For hooks: match naming, parameter patterns, return types, and cleanup handling.

---

### Step 5: Wire It In

A new file that isn't connected to anything is a file waiting to cause a
"where did this come from?" moment three months later. Find every registration
point the exemplars use and add the new file to each one.

**Common wiring points:**

| Registration Point | How to Find It | What to Add |
|---|---|---|
| Barrel exports | `index.ts` in same or parent directory | `export { NewThing } from './NewThing'` |
| Route registration | Router config (search for exemplar's route) | New route entry |
| Module registry | Bootstrap/registration file | New registration call |
| Navigation/sidebar | Nav config array | New entry (if appropriate) |
| Lazy loading map | Dynamic import map | New lazy import |
| Type unions | Discriminated unions listing variants | New variant |

**Rules for wiring:**
- Only wire into registration points the exemplars actually use
- Match the exact format — same spacing, trailing commas, comment style
- If alphabetical ordering is used, maintain it
- Never create new registration points — only add to existing ones

---

### Step 6: Verify

After all files are generated and wired:

1. Run the project's typecheck command. Every generated file must pass.
   Fix any type errors before exiting — do not leave the user with broken files.
2. Verify the main file is importable from outside its directory via the convention
   (barrel export, direct import, or however the project imports this type).
3. Re-read the exemplars one more time and compare against the generated output.
   Flag and fix any deviations noticed in this final pass.

**Output the scaffold summary:**

```
SCAFFOLD COMPLETE

Created:
  - src/components/UserProfile/UserProfile.tsx (component)
  - src/components/UserProfile/UserProfile.test.tsx (test)
  - src/components/UserProfile/UserProfile.types.ts (types)

Wired into:
  - src/components/index.ts (barrel export)
  - src/routes/routes.ts (route registration)

Conventions from:
  - src/components/PostCard/PostCard.tsx
  - src/components/CommentList/CommentList.tsx

Typecheck: PASS
```

---

## Constraints

- **Exemplar-driven, not template-driven.** The kit generates nothing from memory or
  generic templates. If it can't find 2+ exemplars of the requested type, it asks
  rather than guessing.
- **No placeholders.** Generated code is functional on first write. Stub comments
  and empty function bodies are not acceptable output.
- **No scope creep.** The kit creates what was asked for and wires it in. It doesn't
  refactor nearby files, update documentation, or make "improvements" to exemplars
  it reads.
- **Only files the project already uses.** No Storybook files if the project doesn't
  use Storybook. No `.types.ts` files if the project puts types inline. Match the
  project, not a preferred convention.

## Safety Notes

- Before generating, confirm the target directory is correct — it's faster to specify
  the right location upfront than to move files after wiring.
- If the generated file replaces an existing one (confirmed by you), review the wiring
  changes carefully — the old file may have been wired differently than the new one.
- The typecheck step catches most generated code issues. If your project's typecheck
  is slow, the verification step still runs — the kit doesn't skip it.
