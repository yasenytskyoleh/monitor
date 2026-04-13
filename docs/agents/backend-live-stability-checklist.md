# Backend Live Stability Checklist (PR #16)

Purpose: decide whether constrained `backend-agent` live execution is stable enough for any scope expansion.

## Scope
- Applies only to constrained backend live mode in `@monitor/orchestrator-runner`.
- Does not change workflow, approval, or artifact contracts.
- Does not unlock broad backend autonomy.

## Stability Gate Criteria
1. Apply safety
- `dry-run` never mutates files.
- `apply` mutates only validated, allowlisted targets.
- Patch limits are enforced (`max files`, `max bytes`, `single root`).

2. Verification safety
- Verification hooks are explicit and allowlisted.
- Failure categories are explicit (`lint_failed`, `typecheck_failed`, `test_failed`, `verification_timeout`).
- Verification failure is surfaced as run failure, not silent success.

3. Rollback safety
- Rollback plan is captured before first write in apply mode.
- Apply/post-apply/verification failure triggers rollback when rollback mode is enabled.
- Rollback restores modified files and removes created files from the validated plan.
- Rollback result is persisted.

4. Artifact and evidence persistence
- Run folder contains `patch-plan.json`, `patch-result.json`, and when relevant rollback artifacts.
- `stability-summary.json` exists and reflects apply/verification/rollback status.

5. Determinism and repeatability
- Repeated identical runner inputs produce the same transition path and terminal state.
- Stability matrix tests pass consistently.

## Required Matrix Scenarios
- safe apply success
- lint failure after apply
- typecheck failure after apply
- test failure after apply
- rollback after verification failure
- repeated identical run determinism
- forbidden path rejection
- forbidden change type rejection

## PR #16 Decision
- Decision: **no scope expansion in this PR**.
- Reason: this PR is audit-first. It adds checklist + matrix evidence + persisted stability summary.
- Expansion (for example controlled `new_file`) is deferred to a follow-up PR after repeated green audit runs.
