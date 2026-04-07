---
schema: kit/1.0
owner: citadel
slug: code-review-5pass
title: 5-Pass Code Review — What Linters Miss
summary: >-
  5 passes: correctness, security, performance, readability, consistency. Every
  finding: file, line, severity, fix. Ends with PASS/CONDITIONAL/FAIL verdict.
version: 1.0.0
license: MIT
tags:
  - code-review
  - security
  - quality
  - correctness
  - performance
  - developer-tools
model:
  provider: anthropic
  name: claude-opus-4-6
  hosting: Anthropic API (api.anthropic.com)
tools:
  - Read
  - Glob
  - Grep
  - Bash
failures:
  - problem: 'No project conventions file found (CLAUDE.md, .eslintrc, etc.).'
    resolution: >-
      Skips convention-specific findings in Pass 5 but still flags internal
      inconsistency within the reviewed code.
    scope: general
  - problem: 'Review target contains binary files, images, or lock files.'
    resolution: Silently skipped. Only source files are reviewed.
    scope: general
  - problem: Diff range references commits that do not exist.
    resolution: Reports the git error. Verify ref names and retry with a valid range.
    scope: general
useCases:
  - scenario: >-
      Pre-merge review of a pull request — use --diff main..feature to focus on
      changed lines.
    constraints: []
    notFor:
      - 'Generated files, lock files, configuration with no logic'
  - scenario: >-
      Security audit preparation — find obvious vulnerabilities before the
      formal audit.
    constraints: []
    notFor: []
  - scenario: Taking over code from another developer or after a fast-moving sprint.
    constraints: []
    notFor: []
inputs:
  - name: review_target
    description: >-
      What to review: a file path, directory, git diff range (--diff HEAD~3 or
      --diff main..feature), or nothing (defaults to staged + unstaged changes).
outputs:
  - name: review_report
    description: >-
      Findings grouped by pass, sorted by severity. Each finding: file, line,
      severity, problematic code, and specific fix.
  - name: verdict
    description: >-
      PASS | CONDITIONAL | FAIL — with one-line rationale and finding counts by
      severity.
selfContained: true
---

# 5-Pass Code Review — What Linters Miss

## Goal

Linters catch style. Formatters catch formatting. Type checkers catch type errors.
None of them catch the things that actually break production.

This kit fills that gap. It runs five structured passes over your code to find
problems that require genuine comprehension to detect: a race condition between
two async operations, an unparameterized query that looks like string formatting,
an O(n²) loop that only matters when your dataset grows, a comment that hasn't
matched the code since the refactor six months ago.

The output is a structured report with every finding numbered, located to the exact
line, and accompanied by a specific fix — not "consider improving this" but "change
line 47 from X to Y because Z."

A verdict at the end (PASS / CONDITIONAL / FAIL) gives you the bottom line in one
word, with finding counts if you need to justify a review decision.

## When to Use

- Before merging any non-trivial pull request
- When taking over code written by someone else (or your past self)
- After a fast-moving sprint where correctness was deprioritized for speed
- Before a security audit — catch the obvious issues yourself first
- When a system is behaving unexpectedly and you suspect the bug is subtle

**Skip this kit for:** generated files, lock files, configuration with no logic,
and code so simple the 5-pass structure would produce empty passes.

**Use `/review --diff main..feature`** for PR reviews — it focuses on changed lines
and their context, distinguishing new-code findings from pre-existing issues.

## Setup

No setup required. The kit reads from your codebase directly.

**Recommended:** have your project's config files at the repo root before running:
- TypeScript: `tsconfig.json`
- ESLint: `.eslintrc.*` or `eslint.config.*`
- Prettier: `.prettierrc.*`
- Python: `pyproject.toml`
- Rust: `Cargo.toml`

These are loaded in Step 2 to establish what "correct" and "consistent" means for
your project specifically. Without them, the review still runs — it just uses
general best practices instead of your project's conventions.

## Steps

### Step 1: Resolve Scope

Determine what's being reviewed based on the input:

- **File path**: read that file
- **Directory**: glob for all source files recursively, skip generated files,
  `node_modules`, lock files, and build artifacts
- **Diff range**: run `git diff <range>` to get changed files and hunks, then read
  the full file for each changed file (context beyond the hunks matters)
- **No argument**: run `git diff HEAD` for staged + unstaged changes

Read all files in scope before starting any pass. Do not re-read during individual passes.

---

### Step 2: Load Project Conventions

Read the project's config files to understand its standards before reviewing against them:
- What import style does it use? (Path aliases? Relative paths? Named vs. default exports?)
- What error handling pattern does it use? (throw vs. Result types vs. callbacks)
- What naming conventions does it follow?
- What test patterns exist?

These become the baseline for Pass 5 (Consistency). Flag deviations from them, not from
generic "best practices" that may not apply to this project.

---

### Pass 1: Correctness

Scan every file for:

- **Logic errors**: inverted conditions, wrong operators, incorrect boolean logic
- **Off-by-one errors**: in loops, slices, index access, range calculations
- **Null/undefined dereference**: accessing properties without guards when the value
  could be null or undefined
- **Missing awaits**: async calls whose results are used without awaiting them
- **Race conditions**: shared mutable state accessed from concurrent async operations
  without synchronization
- **Type coercion**: loose equality (`==`), implicit type conversions, surprising
  JavaScript truthiness/falsiness
- **Resource leaks**: connections, handles, event listeners, or subscriptions opened
  but never closed
- **Missing cleanup**: effects or lifecycle methods that set up state but don't
  tear it down
- **Edge cases**: what happens with an empty array? A zero value? A negative number?
  An extremely large input?
- **State mutations**: direct mutation of state that's supposed to be immutable

---

### Pass 2: Security

Scan for OWASP Top 10 and common vulnerabilities:

- **Injection**: SQL, NoSQL, command, template, LDAP — any user input reaching a
  query or command without parameterization
- **XSS**: user input rendered as HTML without sanitization, `dangerouslySetInnerHTML`,
  `innerHTML`, unescaped template interpolation
- **Broken auth**: missing authentication checks on endpoints, broken access control,
  privilege escalation paths, JWT validation gaps
- **Hardcoded secrets**: API keys, tokens, passwords, or connection strings in source
  code instead of environment variables
- **Unsafe deserialization**: `eval()`, `Function()`, `JSON.parse` on untrusted input
  without schema validation, `pickle.loads`, `yaml.load` without SafeLoader
- **SSRF**: user-controlled URLs passed to fetch/request without allowlist validation
- **Path traversal**: user input in file paths without sanitization
- **Insecure crypto**: MD5/SHA1 for passwords, ECB mode, hardcoded IVs, `Math.random()`
  for security-sensitive values

---

### Pass 3: Performance

Scan for measurable performance problems — not micro-optimizations, but issues that
cause degradation at scale:

- **Algorithmic**: O(n²) or worse in paths that scale with data size
- **Allocation in hot paths**: creating objects or arrays inside render functions,
  animation loops, or frequently-called functions when they could be hoisted
- **Missing memoization**: expensive derivations recomputed on every call when inputs
  haven't changed
- **N+1 queries**: database or API calls inside loops instead of batched operations
- **Unnecessary bundle weight**: importing entire libraries for one function
- **Render performance** (frontend): new object/array references causing unnecessary
  re-renders, missing memoization on expensive derived values, inline function props
  recreated on every render in high-frequency components
- **I/O in hot paths**: synchronous reads, blocking operations, or layout-forcing DOM
  calls inside animation loops
- **Unbounded queries**: queries or list renders with no pagination or limits

---

### Pass 4: Readability

Scan for code that will cost the next developer (or you, in three months) extra time
to understand:

- **Vague naming**: `data`, `info`, `result`, `handle`, `process` — names that describe
  shape but not meaning
- **Misleading naming**: `isValid` returning a string, `getUser` having side effects
- **Function length**: functions over 50 lines doing multiple distinct things
- **Cognitive complexity**: three or more levels of nesting, complex boolean expressions
  that could be extracted to named variables
- **Dead code**: unreachable branches, commented-out blocks, unused variables and imports
- **Stale comments**: comments that describe what the code did before a refactor
- **Magic values**: hardcoded numbers or strings without named constants
- **Mixed abstraction levels**: high-level orchestration and low-level implementation
  interleaved in the same function

---

### Pass 5: Consistency

Scan against the project conventions loaded in Step 2:

- Does the code follow the project's import ordering and alias usage?
- Does it use the project's error handling pattern?
- Does it follow the project's file organization conventions?
- Do new functions follow the existing signature and return type patterns?
- Do new identifiers follow the project's naming conventions?

Also flag *internal inconsistency* — if some functions in a module throw and others
return null for errors, that's a finding even without an established convention.

---

### Format Every Finding

Each finding must include:
- **File**: the path
- **Line**: exact line number or range
- **Severity**: `CRITICAL`, `WARNING`, or `INFO`
- **Finding**: one sentence describing the problem
- **Code**: the specific problematic lines
- **Fix**: what to do about it — specific, not vague

**Severity calibration:**
- `CRITICAL`: will cause bugs, security vulnerabilities, data loss, or crashes
- `WARNING`: causes problems under specific conditions, degrades performance,
  or creates meaningful maintenance burden
- `INFO`: style improvement, minor clarity gain, preventive suggestion

---

### Produce the Verdict

```
## Code Review: {target}

Scope: {N files, M total lines} | Mode: {file | directory | diff}

---

### Pass 1: Correctness
{findings or "No findings."}

### Pass 2: Security
{findings or "No findings."}

### Pass 3: Performance
{findings or "No findings."}

### Pass 4: Readability
{findings or "No findings."}

### Pass 5: Consistency
{findings or "No findings."}

---

## Verdict: {PASS | CONDITIONAL | FAIL}
{one-line rationale}

| Severity | Count |
|---|---|
| Critical | N |
| Warning  | N |
| Info     | N |
```

For diff reviews: distinguish findings in new/changed code from pre-existing issues
surfaced by context. Prioritize the new-code findings.

---

## Constraints

- **Don't duplicate linter output.** Don't flag things the project's linter or formatter
  catches automatically (missing semicolons, indentation, unused vars that ESLint flags).
  Focus on semantic issues that require comprehension to detect.
- **No false positives from skimming.** For every finding, verify you read the surrounding
  code. A "missing null check" that's actually guarded by the caller is not a finding.
  An "unused import" that's used in a type annotation is not a finding.
- **The review is the deliverable.** Don't offer to fix findings unless asked. The review
  surfaces issues; the developer decides which ones to address and how.
- **Line numbers must be accurate.** A finding pointing to the wrong line is worse than
  no finding. Verify each cited line against the actual file content.

## Safety Notes

- Pass 2 (Security) findings rated CRITICAL should be treated as blocking for production
  deployments. Don't ship CRITICAL security findings.
- When reviewing authentication or authorization logic, read the entire auth flow, not
  just the changed file — a bypass may be in an upstream guard, not the file being reviewed.
- If the review surfaces hardcoded credentials, do not include the actual credential value
  in the report — just the location and the finding.

