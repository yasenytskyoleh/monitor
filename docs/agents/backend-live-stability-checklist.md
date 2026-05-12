# Backend Live Stability Checklist

Purpose: keep constrained `backend-agent` live execution stable while preserving strict safety boundaries.

This checklist belongs to the **internal orchestration subsystem**.
It supports the repo's **Codex-first workflow** by defining the evidence expected when Codex or another operator invokes constrained backend live mode. It does not require separate human-operated agents or separate user identities.

## Scope
- Applies only to constrained backend live mode in `@monitor/orchestrator-runner`.
- Covers isolated execution, verification, rollback, promotion, and narrow helper-file creation.
- Does not unlock broad backend autonomy.

## Stability Gate Criteria
1. Apply safety
- `dry-run` never mutates files.
- `apply` mutates only validated, allowlisted targets.
- Patch limits are enforced (`max files`, `max bytes`, `single root`).

2. Verification safety
- Verification hooks are explicit and allowlisted.
- Verification failures are surfaced as run failures (not silent success).

3. Rollback safety
- Rollback plan is captured before first write in apply mode.
- Apply/post-apply/verification failures trigger rollback when rollback mode is enabled.
- Rollback restores modified files and removes created files from validated plan.
- Helper files created during failed runs are deleted by rollback.

4. Promotion safety
- Promotion is opt-in (`promote_verified`) and never implicit.
- Promotion includes only validated + applied target files.
- Promotion conflict checks block overwrite when main workspace changed during isolation.
- Promotion remains all-or-nothing.

5. Artifact and evidence persistence
- Run folder contains `patch-plan.json`, `patch-result.json`, `workspace-summary.json`, and relevant rollback/promotion artifacts.
- `stability-summary.json` exists and reflects apply/verification/rollback status.
- `stability-reassessment.json` exists for dedicated reassessment runs.

6. Determinism and repeatability
- Repeated identical runner inputs produce the same transition path and terminal state.
- Reassessment matrix tests pass consistently.

## Required Matrix Scenarios
- safe isolated apply success
- helper-file create + verify + promote success
- lint failure after apply
- rollback after verification failure
- helper-file rollback deletion
- promotion conflict block
- repeated identical run determinism
- forbidden helper path rejection
- forbidden extension rejection

## Related docs
- detailed reassessment checklist:
  - `docs/agents/backend-live-stability-reassessment.md`
