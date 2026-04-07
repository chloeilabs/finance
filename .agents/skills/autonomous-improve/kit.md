---
schema: kit/1.0
owner: citadel
slug: autonomous-improve
title: 'Autonomous Quality Loop — Score, Attack, Verify, Repeat'
summary: >-
  Scores against a rubric, attacks the highest-leverage axis, verifies no
  regressions, documents the learning, and loops. Re-scores from scratch each
  iteration.
version: 1.0.0
license: MIT
tags:
  - quality
  - autonomous
  - improvement
  - rubric
  - iteration
  - agents
  - multi-agent
model:
  provider: anthropic
  name: claude-opus-4-6
  hosting: Anthropic API (api.anthropic.com)
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
  - Agent
failures:
  - problem: No rubric exists for the target.
    resolution: >-
      Phase 0 drafts one and halts for your approval. The rubric defines what
      "better" means — it cannot be auto-approved.
    scope: general
  - problem: Fix attempt causes a regression in a previously-passing axis.
    resolution: >-
      Changes are reverted automatically. The loop logs the failed approach,
      penalizes the axis in next-loop selection, and continues without
      committing.
    scope: general
  - problem: No improvement in two consecutive loops (plateau).
    resolution: >-
      Level-Up Protocol triggers — halts, presents re-anchoring proposals for
      the rubric at a higher quality tier. Resumes only after your approval.
    scope: general
  - problem: Security axis fails a programmatic check.
    resolution: >-
      Treated as a blocking issue — halts the entire loop. Security is the
      floor, not one axis among equals.
    scope: general
useCases:
  - scenario: >-
      Systematic quality improvement of a product, module, or codebase over
      multiple sessions.
    constraints:
      - >-
        Requires a rubric — Phase 0 creates one with your approval if none
        exists
    notFor:
      - Quick bug fixes (use systematic-debugging)
      - One-off code reviews (use code-review-5pass)
  - scenario: >-
      After shipping a fast MVP — identify and fix the highest-leverage rough
      edges first.
    constraints: []
    notFor: []
  - scenario: >-
      Continuous improvement running overnight — pairs with the Daemon kit for
      unattended operation.
    constraints:
      - Budget cap recommended for overnight runs
    notFor: []
inputs:
  - name: target
    description: >-
      Slug identifying what to improve. Maps to .planning/rubrics/{target}.md.
      If none exists, Phase 0 runs first.
  - name: loops
    description: >-
      Number of improvement loops to run. If omitted, runs until all axes score
      ≥8.0 or plateau is detected.
  - name: score_only
    description: >-
      Run scoring only — produce the rubric scorecard without attacking any
      axis. Use to get a baseline first.
outputs:
  - name: scorecard
    description: >-
      Full rubric scorecard: scores from three evaluators, final (minimum), and
      deltas from previous loop.
  - name: loop_log
    description: >-
      .planning/improvement-logs/{target}/loop-{n}.md — what was attacked,
      verification results, what changed, what was learned.
  - name: handoff
    description: >-
      Summary: score movement per axis, outcome (improved/plateau/ceiling), next
      recommended axis.
---

# Autonomous Quality Loop — Score, Attack, Verify, Repeat

## Goal

Quality doesn't improve through sprints. It improves through iteration — scoring
what exists, picking the worst thing, fixing it, and doing it again. The problem
is that iteration requires sustained attention. Sessions end. Context resets.
The loop stalls.

This kit automates the iteration. It runs a tight cycle: score everything against
a rubric, select the single highest-leverage axis, attack it with a real fix,
verify the fix worked and nothing regressed, document what was learned, then loop.
Each iteration re-scores from scratch — because what you fixed this loop changes
the priority order for the next.

The rubric is the key design choice. It's not a checklist. Each axis has three
anchors (what a 0 looks like, what a 5 looks like, what a 10 looks like), a weight,
and programmatic verification specs where possible. This makes scores arguable,
not vibes-based. Three independent evaluators score each axis and the minimum
score wins — because a low score from any evaluator is an unresolved problem, and
averaging would hide it.

The loop stops when you tell it to, when a quality ceiling is reached (all axes >= 8.0),
or when the rubric has been extracted to its ceiling and needs to be re-anchored at
a higher standard.

## When to Use

- A product, module, or codebase that needs systematic quality improvement over time
- After shipping a fast MVP that you know has rough edges but aren't sure which to
  address first
- When you want to improve a specific dimension (documentation, test coverage,
  security posture) but aren't sure where the gaps actually are
- As a continuous improvement process across multiple sessions or overnight runs
  (pairs with the Daemon kit for unattended operation)

**Not for:** quick bug fixes (use Systematic Debugging), one-off code reviews
(use the Review kit), or simple refactors. The loop has overhead. It earns its
cost on targets where the improvement space is wide and the priority isn't obvious.

**Good first run:** use `--score-only` to get your baseline before committing to
improvement loops. You'll see where you actually stand, which makes the case for
how many loops are warranted.

## Setup

**Create a rubric before running your first loop.**

The rubric is a markdown file at `.planning/rubrics/{target}.md`. If it doesn't exist,
the kit's Phase 0 drafts one and asks for your approval.

A good rubric has:
- 8-14 axes organized into 3-5 categories (don't go narrow, don't go sprawling)
- Each axis with a weight (0.0-1.0), a category, and three anchors (0/5/10)
- Programmatic verification specs for at least half the axes (things that can be
  checked with a script, not just judged by eye)

**Why approval is required:** the rubric defines what "better" means. If the axes are
wrong, the loop optimizes the wrong things. Phase 0 drafts; you decide.

**Directory structure:** the kit uses `.planning/` for state. Create it at your project root
if it doesn't exist, or let Phase 0 create it on first run.

## Steps

### Phase 0: Rubric Bootstrap (first run only, requires your approval)

Runs only when `.planning/rubrics/{target}.md` doesn't exist.

1. If research on comparable products exists in `.planning/research/`, reads it
2. If not, runs a multi-scout research pass to understand the quality landscape
3. Drafts 8-14 axes with weights, categories, anchors, and verification specs
4. Presents the draft with rationale for each axis
5. **Stops. Waits for your approval.** You edit the rubric, confirm it, and the loop begins.

This is the only mandatory human gate. Everything after this is autonomous.

---

### Phase 1: Score (every loop, no exceptions, no caching)

Three independent evaluator agents score every axis in the rubric simultaneously.
Each evaluator receives:
- The full rubric with axis definitions and anchors
- Read access to the target
- Their assigned persona (Experienced User, Newcomer, or Critical Reviewer)
- Instructions to score independently — they don't see each other's scores

**For each axis, the final score is the minimum of the three evaluators.** Not the average.
A score of 6, 8, 7 produces a final score of 6. A low score from any evaluator
means there's a real unresolved problem somewhere. The minimum surfaces it.

Programmatic checks run in parallel with evaluator scoring. A failed programmatic
check caps the axis at 5, regardless of evaluator scores.

The scorecard:
```
Axis                    | A  | B  | C  | Prog | Final | Delta
------------------------|----|----|----|----- |-------|------
security_posture        | 7  | 8  | 6  | PASS |  6.0  |
test_coverage           | 4  | 3  | 5  | FAIL |  3.0  | cap
documentation_accuracy  | 6  | 6  | 7  | PASS |  6.0  |
```

---

### Phase 2: Select

Choose the single axis to attack this loop using a selection formula:

```
score(axis) = (10 - current_score) × weight × effort_multiplier × recency_penalty
```

- **effort_multiplier**: low-effort changes = 1.0, medium = 0.7, high-effort = 0.4
  (lower-effort improvements get priority — more ground covered per loop)
- **recency_penalty**: 0.5 if this axis was attacked in either of the last two loops
  (prevents fixation on one axis while others deteriorate)

The selection and its rationale are shown before any attack begins. You can override
with `--axis {name}` to force a specific axis regardless of scoring.

---

### Phase 3: Attack

Execute the improvement. Strategy depends on the axis category:

- **Technical axes** (test coverage, reliability, API consistency): run targeted
  experiments, measure before/after, commit only if improvement is verified
- **Documentation axes**: read current docs, identify specific gaps or inaccuracies,
  rewrite the specific sections — not wholesale rewrites unless the score is below 3
- **Experience axes** (onboarding, error recovery, discoverability): structural fixes
  plus documentation updates plus verification of the actual user path
- **Security axes**: read the specific code involved, make targeted changes, run
  programmatic checks before committing

Each approach is tried in isolation before committing. If multiple approaches are
evaluated, the decision record is written to the loop log — future loops can read
why the winner won.

---

### Phase 4: Verify

After the attack, re-score only the targeted axis (not a full re-score — that's Phase 1
of the next loop):

1. **Programmatic**: run the axis's specific checks — do they now pass?
2. **Structural**: verify structural requirements are met
3. **Perceptual**: spawn a single Newcomer evaluator (the hardest-to-satisfy persona)
   to score the targeted axis independently
4. **Behavioral simulation** (for onboarding/UX axes): follow the actual user path
   in a clean environment with no prior knowledge — does it work?

**Regression check**: re-run programmatic checks on every axis that shares files with
the changes. If anything that was passing now fails: **revert the changes**. Don't commit
improvements that break something else.

A behavioral FAIL overrides a passing perceptual score. If the user path is broken,
the loop doesn't commit regardless of what the evaluator said.

---

### Phase 5: Document

Every loop gets a log at `.planning/improvement-logs/{target}/loop-{n}.md`.
Even loops that end in no-change or revert. Especially those.

The log records:
- The full scorecard with deltas from the previous loop
- What was changed and why that approach was chosen
- Verification results across all four tiers
- What was learned that future loops should know

This institutional memory is what makes later loops smarter than earlier ones.

---

### Phase 6: Loop or Exit

The loop exits when:
1. A loop count (`--loops N`) is specified and N loops have completed
2. All axes score >= 8.0 (quality ceiling reached)
3. No axis improved > 0.5 in either of the last two loops and at least 3 loops
   have completed (plateau — Level-Up Protocol is triggered)
4. You say stop

**On plateau (Level-Up Protocol):** the current rubric has been extracted to its ceiling.
The kit freezes the current state, proposes re-anchored axes where the current 10 becomes
the new 5, and waits for your approval before continuing. This is how the quality bar
gets raised, not just approached.

---

## Constraints

- **Phase 0 requires your approval.** The rubric is the only thing that requires human
  judgment. Once it's set, the loop runs autonomously.
- **The loop never writes to the live rubric.** Proposed axis additions or re-anchorings
  go to `.planning/rubrics/{target}-proposals.md`. You approve before they take effect.
- **Level-Up Protocol requires your approval.** The loop halts and waits. It doesn't
  self-upgrade the rubric.
- **Regressions block commits.** If the fix breaks something that was passing, the change
  is reverted. The loop continues without a commit for that iteration.
- **Security axis failures are blocking.** A failed security programmatic check halts
  the entire loop — it doesn't get treated as "just a low score."

## Safety Notes

- Use `--score-only` first to see your baseline before spending tokens on attack loops.
  Knowing your scores in advance helps you calibrate how many loops are warranted.
- Each loop commits its changes separately. If a loop produces an unwanted result,
  `git revert <commit>` undoes that loop's changes without touching others.
- For overnight / unattended runs, pair this kit with the Daemon kit, which handles
  session continuity and budget enforcement automatically.
- Set a loop count (`--loops 3`) for your first run rather than running until ceiling.
  It's easier to add loops than to undo them.
