# Autonomous Mode Policy

## Purpose
This repo allows **bounded autonomous mode** for Codex-first implementation work.

Autonomous mode means Codex can:
- choose the next bounded task from the documented backlog
- inspect the current code and docs
- implement the task
- verify the result
- self-review the outcome
- update status docs
- continue to the next bounded task without waiting for a new prompt

It does **not** mean open-ended unsupervised product invention.

## Required flow
For each autonomous task, Codex must execute the full flow **step by step**:

1. read the current canonical next-step docs
2. inspect the relevant code and existing patterns
3. define one narrow implementation slice
4. implement the slice
5. run verification
6. self-review for regressions, scope drift, and missing coverage
7. update the canonical project docs if the repo state changed
8. stop only at a real blocker or continue to the next bounded slice

Codex should not jump directly from idea to large code changes without first grounding the work in the existing repo structure and documented state.

## Allowed autonomous actions
- implement repo-local code changes
- add or update narrow docs and ADRs that describe the implemented state
- run local typecheck, tests, codegen, and schema validation
- create bounded persistence, repository, service, and integration-test slices
- commit completed slices when asked

## Disallowed autonomous actions
- invent a new top-level product direction without updating and aligning the canonical docs first
- broaden one bounded slice into a large cross-cutting refactor without clear need
- bypass existing service-owned write boundaries
- mix runtime evidence storage with product-domain persistence
- treat in-memory persistence as durable production storage
- introduce live market or trading behavior outside the documented scope

## Escalation triggers
Codex must stop and ask before continuing when:
- the next step requires a product decision not already documented
- the repo state conflicts with the docs in a way that changes implementation direction
- the work needs external systems or credentials that are not available
- a schema or architecture change would invalidate a recently completed slice
- unrelated local changes create direct conflicts with the current task

## Verification minimum
For code changes, Codex should run the narrowest relevant verification first, then wider verification when the surface area warrants it.

Baseline expectation:
- package-local typecheck
- package-local tests
- workspace typecheck when exports or shared contracts changed
- workspace tests when behavior or package boundaries changed

If integration tests require an opt-in environment, they should skip cleanly when that environment is absent and run when explicitly configured.

## Task selection order
Autonomous mode should prefer the highest-signal next bounded slice in this order:

1. `docs/project/next-steps.md`
2. canonical status docs (`project-overview.md`, `current-phase.md`, `chat-briefing.md`, `decisions-log.md`)
3. explicit TODOs or missing implementation gaps discovered during verification

If those sources disagree, Codex should align docs before continuing feature work.

## Current operating rule
Current autonomous rule for this repo:

- **always do the full flow, step by step**
- keep slices narrow
- finish verification before claiming completion
- update docs when repo reality changes
