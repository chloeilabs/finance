---
schema: kit/1.0
owner: citadel
slug: systematic-debugging
title: Systematic Debugging — Root Cause Before Fix
summary: >-
  4-phase debug protocol: observe → hypothesize → verify → fix. No code changes
  without a confirmed root cause. Emergency stop after two failed attempts.
version: 1.0.0
license: MIT
tags:
  - debugging
  - root-cause-analysis
  - quality
  - methodology
  - developer-tools
model:
  provider: anthropic
  name: claude-sonnet-4-6
  hosting: Anthropic API (api.anthropic.com)
tools:
  - Read
  - Grep
  - Bash
failures:
  - problem: Bug cannot be reproduced.
    resolution: >-
      Stop at Phase 1. Document every known triggering condition precisely. Ask
      for more context rather than forming hypotheses from irreproducible
      symptoms.
    scope: general
  - problem: Two consecutive fix attempts have failed.
    resolution: >-
      Emergency Stop Rule: return to Phase 2 with entirely new hypotheses.
      Re-read the relevant code from scratch first. Never attempt a third guess
      from the same understanding.
    scope: general
  - problem: Bug is in a dependency or generated file that cannot be modified.
    resolution: >-
      Document the root cause but do not touch the dependency. Propose a
      workaround in the consuming code and note the upstream issue.
    scope: general
useCases:
  - scenario: >-
      A non-trivial bug where the cause is not immediately obvious from the
      error.
    constraints: []
    notFor:
      - >-
        Trivial typos or config mistakes where the error points directly to the
        fix
  - scenario: An intermittent failure that is hard to reproduce consistently.
    constraints:
      - Must be reproduced at least once before forming hypotheses
    notFor: []
  - scenario: A debugging session where a previous fix attempt made things worse.
    constraints: []
    notFor: []
inputs:
  - name: bug_description
    description: >-
      Error message, stack trace, or behavioral description. Can be a file path,
      pasted error, or natural language description of wrong behavior.
outputs:
  - name: problem_statement
    description: >-
      Structured statement: "{Component} does {X} when it should do {Y},
      triggered by {condition}, at {file}:{line}"
  - name: root_cause
    description: >-
      Causal explanation: "The bug occurs because {cause}. This happens when
      {trigger}."
  - name: fix
    description: >-
      Minimal code change addressing the root cause, with notes on any related
      occurrences found and fixed.
selfContained: true
---

# Systematic Debugging — Root Cause Before Fix

## Goal

Most bugs get fixed wrong the first time because they get fixed *before they get understood*.
A developer sees an error, makes a plausible guess, applies a change, and either gets lucky
or creates three new bugs in the process.

This kit enforces a single rule: **no code changes without a confirmed root cause.**

The four-phase protocol — observe, hypothesize, verify, fix — sounds obvious, but the
discipline of writing down a problem statement before forming any hypothesis, and
*verifying* the hypothesis before touching code, eliminates a category of debugging
failure that experience alone doesn't prevent.

The emergency stop after two failed fixes is the other critical feature. If you've tried
twice and the bug is still there, you're guessing. The kit forces you to stop, re-read,
and form new hypotheses instead of escalating the damage.

## When to Use

- Any non-trivial bug where the cause isn't immediately obvious from the error
- Intermittent failures that are hard to pin down
- Bugs where a previous fix attempt made things worse
- Any debugging session that's already consumed more than 20 minutes without a fix

**Skip this kit for:** trivial typos, obvious off-by-ones visible in the diff, and
configuration mistakes where the error message points directly to the fix.

## Setup

No setup required. This kit works on any codebase in any language.

If the project has a typecheck command (`npm run typecheck`, `cargo check`, `mypy`, etc.),
have it ready — you'll run it after applying the fix to verify no regressions.

If the project has a test suite, know how to run the relevant subset. A failing test
is the ideal reproduction vehicle.

## Steps

### Phase 1: Observation and Reproduction

Before forming any theory about what's wrong, establish what *is* wrong — precisely.

**1.1 Read the error fully.** Not the first line. The whole thing. Stack traces contain
the actual failure location. Error messages often contain the fix. Read before searching.

**1.2 Reproduce the issue.** A bug you can't reproduce is a bug you can't verify you've
fixed:
- For type errors: run typecheck and read the full output
- For runtime errors: identify the exact inputs or user action that triggers it
- For behavioral bugs: document expected vs. actual behavior in one sentence each

**1.3 Isolate to a specific location:**
- What file? What function or component? What line range?
- What are the inputs when it fails?
- Is this consistent or intermittent? (If intermittent, document every triggering condition
  you can identify before proceeding)

**Checkpoint — write this before continuing:**
```
Problem statement: "{Component/function} does {X} when it should do {Y},
triggered by {condition}, located at {file}:{approximate line}"
```

Do not proceed to Phase 2 until this statement is written.

---

### Phase 2: Hypothesis and Verification

**2.1 Form up to three hypotheses** for WHY the bug exists. Force yourself to rank them:
```
H1: {most likely cause} — evidence: {what in the code suggests this}
H2: {second candidate} — evidence: {what makes this plausible}
H3: {third candidate} — evidence: {why this can't be ruled out}
```

**2.2 Design a verification step for each hypothesis.** This means adding a diagnostic
that *observes without changing*:
- A `console.log` or `print` at a specific point to check a value
- Reading a specific variable or state at the moment of failure
- Checking whether a condition is true when you expect it to be false

**CRITICAL:** Do not change any logic during Phase 2. Only observe.

**2.3 Run the verification.** Which hypothesis was confirmed? Which were eliminated?

If all three hypotheses are eliminated: you have new information. That's progress.
Form a new set of hypotheses using what you just learned and repeat from 2.1.

---

### Phase 3: Root Cause Analysis

Once a hypothesis is confirmed, the real work begins: understanding *why*, not just *where*.

**3.1 Trace the causal chain backward** from the symptom to the source:
- Who calls the failing function, and with what arguments?
- Where do those arguments come from?
- What assumption does the code make about the input that's being violated?

**Write the root cause statement:**
```
"The bug occurs because {cause}. This happens when {trigger condition}.
The incorrect assumption is {what the code expects vs. what it receives}."
```

**3.2 Check for siblings.** Is this pattern used elsewhere?
- Search the codebase for the same function signature, the same assumption, the same pattern
- A bug born from a wrong assumption is often present in 2-3 other places

---

### Phase 4: Implementation

**4.1 Write a failing test** that reproduces the bug before fixing it (if a test framework
exists). This is your proof that the bug was real and your verification that the fix works.

**4.2 Apply the minimal fix.** Change only what's necessary to address the root cause:
- Fix the incorrect assumption at its source, not at every symptom
- Do not refactor surrounding code while fixing the bug
- Do not add "defensive" checks for conditions that shouldn't occur

**4.3 Verify the fix:**
- The test case (if written) now passes
- Typecheck passes with no new errors
- The original reproduction scenario no longer triggers the bug
- Any related occurrences found in 3.2 are also fixed or documented

---

### Emergency Stop Rule

**If two fix attempts have failed: stop.**

Do not try a third fix based on the same understanding of the problem. The root cause
analysis was wrong somewhere. Your options:

1. Return to Phase 2 with fresh eyes and new hypotheses — read the failing code again
   from scratch before forming them
2. Ask for more context about the system's intended behavior
3. Check whether there's a higher-level architectural issue (the bug is a symptom,
   not the disease)

Three failed fixes in a row is the definition of guessing. The kit protects against it.

---

## Constraints

- **No fixes in Phase 2.** Verification is diagnostic-only. Adding a `console.log` is fine.
  Changing logic is not.
- **One hypothesis confirmed is enough to proceed.** You don't need to test all three.
  But you must test at least one before writing the fix.
- **The fix addresses the root cause, not the symptom.** If the root cause is "caller
  passes null when the function expects a number," the fix is at the call site, not adding
  `if (value === null) return` inside the function.
- **No scope creep during the fix.** The bug fix PR contains only the fix. Related
  improvements go in a separate commit.

## Safety Notes

- Before fixing a bug in a shared module used by many callers, search for all call sites
  and verify the fix doesn't break any of them
- If the fix changes a public API (function signature, return type, event shape), treat
  it as a breaking change and communicate it
- If Phase 2 reveals that the "bug" is actually the specified behavior and the spec is
  wrong, stop and clarify the requirement before touching code — you may be about to
  break something intentional
