# Orchestrator Runner

Run workflow transitions using:
- compiled config snapshot
- `OrchestratorCore`
- deterministic mocked handlers (`--mode mock`)
- per-agent execution mode selection (`--agent-mode ...`)

## Requirements
- repository configs present under `configs/agents`
- `OPENAI_API_KEY` in environment or `.env` whenever any agent is configured as `live`

## Environment setup
Create `.env` in repo root from the template. Runner auto-loads it on start:

```bash
cp .env.example .env
```

Optional: if you prefer shell-level env vars, you can still `source .env` manually.

## Usage
Default mode is `live`:
- `product-agent` resolves to `live`
- `architect-agent` resolves to `live`
- `quant-pattern-agent` resolves to `live`
- `backend-agent` resolves to `live` (constrained patch mode)
- `docs-reviewer-agent` resolves to `live`

Backend write mode:
- default is `--backend-write dry-run` (no filesystem mutation)
- use `--backend-write apply` to allow constrained patch application for `backend-agent`

Backend rollback mode:
- default is `--backend-rollback restore_written_files` in apply mode
- available modes: `none`, `restore_written_files`, `full_run_cleanup`
- rollback is triggered automatically when apply/post-apply/verification fails
- dry-run mode never produces rollback plans

Backend verification mode:
- default is `--backend-verify none`
- available modes: `none`, `lint`, `lint+typecheck`, `lint+typecheck+test`
- verification hooks run only when backend apply mode is active

Execution mode precedence:
1. Start from `--mode`.
2. Resolve defaults for all agents.
3. Apply `--agent-mode` overrides.
4. Validate final map before execution.

Current live adapter coverage:
- `product-agent`: live supported
- `architect-agent`: live supported
- `quant-pattern-agent`: live supported
- `backend-agent`: live supported in constrained patch mode
- `docs-reviewer-agent`: live supported

Backend live status:
- live backend adapter execution is enabled in constrained patch mode
- backend live safety contract is enforced at runtime
- contract docs: `docs/agents/backend-live-safety.md`
- stability gate checklist: `docs/agents/backend-live-stability-checklist.md`
- contract schema/validators:
  - `src/adapters/live/schemas/backend-agent-response-schema.ts`
  - `src/adapters/live/validators/backend-safety-rules.ts`
  - `src/adapters/live/validators/assert-backend-output.ts`

Run mocked happy flow:
```bash
pnpm runner run \
  --mode mock \
  --scenario happy \
  --env local \
  --version v1 \
  --task-id task-mock-001 \
  --requested-by oleh \
  --task-title "Mock happy flow"
```

Run hybrid mode explicitly (recommended):
```bash
pnpm runner run \
  --mode mock \
  --agent-mode product=live,architect=live,quant-pattern=live,backend=live,docs-reviewer=live \
  --backend-write dry-run \
  --backend-rollback restore_written_files \
  --backend-verify none \
  --scenario happy \
  --env local \
  --version v1 \
  --task-id task-hybrid-001
```

Run missing-approval rejection flow:
```bash
pnpm runner run \
  --mode mock \
  --scenario missing-approval \
  --env local \
  --version v1 \
  --task-id task-mock-002 \
  --requested-by oleh \
  --task-title "Mock rejection flow"
```

Run missing-approval with live Architect (approval gate remains enforced):
```bash
pnpm runner run \
  --mode mock \
  --agent-mode architect=live \
  --scenario missing-approval \
  --env local \
  --version v1 \
  --task-id task-mock-arch-live-rejection
```

Run both scenarios in one command:
```bash
pnpm runner run \
  --mode mock \
  --scenario both \
  --env local \
  --version v1 \
  --task-id task-mock-003 \
  --requested-by oleh \
  --task-title "Mock both flows"
```

Optional input payload from JSON file:
```bash
pnpm runner run \
  --mode mock \
  --scenario happy \
  --env local \
  --input-file ./runtime/task-input.json
```

Output is stable text by default:
- run id
- final state and outcome
- rejection reason (when applicable)
- run artifact folder path

Use JSON output for automation:
```bash
pnpm runner run \
  --mode mock \
  --scenario happy \
  --env local \
  --output json
```

Outcome values:
- `success`
- `policy_rejection`
- `runtime_failure`

Persisted run artifacts are written to:
- `runtime/runs/<runId>/run.json`
- `runtime/runs/<runId>/transitions.json`
- `runtime/runs/<runId>/terminal-outcome.json`
- `runtime/runs/<runId>/approvals.json`
- `runtime/runs/<runId>/artifacts.json`
- optional: `runtime/runs/<runId>/patch-plan.json`
- optional: `runtime/runs/<runId>/patch-result.json`
- optional: `runtime/runs/<runId>/rollback-plan.json`
- optional: `runtime/runs/<runId>/rollback-result.json`
- optional: `runtime/runs/<runId>/verification-result.json`
- `runtime/runs/<runId>/stability-summary.json`
- optional: `runtime/runs/<runId>/input-task.json`
- optional: `runtime/runs/<runId>/compiled-snapshot-meta.json`

`run.json` includes resolved `agentModes` so each run is fully traceable.

Artifact enforcement is strict across workflow transitions:
- emitted artifacts are normalized into explicit records (`artifactRef`, `artifactType`, `producedBy`, `state`, `runId`, `taskId`, `version`, `createdAtUtc`)
- each agent role can emit only allowlisted artifact types
- transition artifact references must resolve to artifacts produced earlier in the same run/scenario
- required artifacts for the target state must exist before the transition is accepted
- violations fail the run as contract/runtime errors (no silent fallback)

Approval enforcement is strict for approval-gated transitions:
- approval reference is required when a transition requires approval
- approval type must match the workflow rule for the exact `from -> to` transition
- approval status must be granted and non-revoked
- approval expiry is enforced via `approvalRef.expiresAtUtc` or workflow `expiresInMinutes`
- approval records are persisted in `approvals.json`
- transition evidence in `transitions.json` includes `approvalType`, `validationStatus`, and `evidenceSummary`
- approval violations are treated as `policy_rejection`; malformed approval/config states are treated as `runtime_failure`

Run default live path (Product + Architect + Quant Pattern + Backend + Docs Reviewer live):
```bash
pnpm runner run \
  --mode live \
  --backend-write dry-run \
  --backend-rollback restore_written_files \
  --backend-verify none \
  --env local \
  --version v1 \
  --task-id task-live-001 \
  --requested-by oleh \
  --task-title "Detect BTC entry points" \
  --model gpt-5.4-mini
```

Allow constrained backend writes explicitly:
```bash
pnpm runner run \
  --mode live \
  --backend-write apply \
  --backend-rollback restore_written_files \
  --backend-verify lint+typecheck+test \
  --env local \
  --version v1 \
  --task-id task-live-apply-001 \
  --requested-by oleh \
  --task-title "Detect BTC entry points"
```

`--agent-mode` format:
- comma-separated `<agent>=<mode>` pairs
- supported aliases: `product`, `architect`, `quant-pattern`, `backend`, `docs-reviewer`
- canonical ids also supported: `product-agent`, `architect-agent`, `quant-pattern-agent`, `backend-agent`, `docs-reviewer-agent`
- valid modes: `mock`, `live`

Examples:
- `--agent-mode product=live`
- `--agent-mode architect=live`
- `--agent-mode quant-pattern=live`
- `--agent-mode docs-reviewer=live`
- `--agent-mode product=live,architect=live,quant-pattern=live,docs-reviewer=live`

Invalid overrides fail fast:
- unknown agent alias/id
- duplicate agent entries
- invalid mode values
- requesting `live` for agents without a live adapter

For `backend-agent=live`, constrained patch-mode safety checks run before any file write.
`--backend-write dry-run` keeps backend patch execution non-mutating.

Live Product Agent contract:
- OpenAI response must be JSON-only
- output must pass `agent-output-envelope` schema validation
- invalid model output fails the run (no silent repair fallback)
- Product live has an intentional agent-specific extension: `metrics` must include
  `problemStatement`, `scope`, `assumptions[]`, `acceptanceCriteria[]`, `backlogItem`
  for bounded intake quality.

Live Architect Agent contract:
- OpenAI response must be JSON-only
- output must pass `agent-output-envelope` and architect-specific structured validation
- invalid model output fails the run (no silent repair fallback)
- Architect completed outputs must include structured design fields in `metrics`:
  `moduleBoundaries[]`, `dataFlow[]`, `contractDefinitions[]`, `adrDraft`, `riskNotes[]`

Live Quant Pattern Agent contract:
- OpenAI response must be JSON-only
- output must pass `agent-output-envelope` and quant-specific structured validation
- invalid model output fails the run (no silent repair fallback)
- Quant completed outputs must include structured fields in `metrics`:
  `patternDefinition`, `measurableConditions[]`, `metricsPlan[]`, `evaluationHorizon`,
  `invalidationAssumptions[]`, `edgeHypothesis`, `testScenarios[]`
- Phase 1 constraints are enforced:
  spot-only scope, no leverage, no funding-rate dependency, no derivatives assumptions

Live Docs Reviewer Agent contract:
- OpenAI response must be JSON-only
- output must pass `agent-output-envelope` and docs-reviewer-specific structured validation
- invalid model output fails the run (no silent repair fallback)
- Docs Reviewer completed outputs must include structured review fields in `metrics`:
  `docsUpdates[]`, `reviewFindings[]`, `changelogNotes[]`,
  `traceabilityConfirmation.{isTraceable,notes[]}`, `missingArtifactWarnings[]`, `driftWarnings[]`
- reviewer stays bounded to review semantics and cannot bypass workflow artifact enforcement

Live Backend Agent constrained mode:
- output must remain structured and include backend change-planning metrics:
  `changePlan[]`, `targetFiles[]`, `changeType`, `requiresSchemaChange`,
  `requiresArchitectureChange`, `requiresMigration`, `proposedDiffs[]`, `testsPlan[]`, `knownLimitations[]`
- strict file-path allowlists apply (no unrestricted writes)
- schema/architecture/migration changes are forbidden in default safety policy and must escalate
- forbidden paths (configs/core packages/lockfiles/env files) are rejected
- allowed change types in first live backend mode:
  - `patch_only`
  - `test_only`
  - `docs_only`
- patch scope limits are enforced:
  - max target file count
  - max total content bytes
  - max per-file content bytes
  - single-root target set
- post-apply validation is enforced:
  - dry-run must not mutate files
  - apply mode must only mutate validated target files
  - all expected target files must exist after apply mode
- backend patch evidence files:
  - `patch-plan.json`
  - `patch-result.json`
- backend rollback evidence files:
  - `rollback-plan.json`
  - `rollback-result.json`
- backend verification evidence file:
  - `verification-result.json`
- verification hook pipeline (allowlisted commands only):
  - `lint`: `pnpm --filter @monitor/orchestrator-runner lint`
  - `typecheck`: `pnpm --filter @monitor/orchestrator-runner typecheck`
  - `test`: `pnpm --filter @monitor/orchestrator-runner test`
- verification is fail-fast and runs only after successful backend apply
- backend patch failure categories are explicit:
  - `patch_validation_failure`
  - `patch_limit_exceeded`
  - `forbidden_path`
  - `forbidden_change_type`
  - `apply_failure`
  - `post_apply_validation_failure`
  - `lint_failed`
  - `typecheck_failed`
  - `test_failed`
  - `verification_timeout`
  - `rollback_failed`
- backend stability audit summary (`stability-summary.json`) captures:
  - apply status
  - verification status
  - rollback status
  - failure categories
  - per-scenario status rollup
- PR #16 is audit-first: no backend scope expansion is enabled in this step.
