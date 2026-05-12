# Backend Live Safety Contract

## Purpose
Define the active safety contract for live `backend-agent` execution in constrained patch mode.

This document describes the **internal orchestration subsystem** backend safety contract.
It supports the repo's **Codex-first workflow** by defining the rules Codex or other operators must satisfy when invoking constrained backend live mode. It does not require separate human-operated agents or separate user identities.

The contract covers:
- allowed patch boundaries,
- required structured output shape,
- validation and escalation rules,
- isolated execution, rollback, and promotion safety.

## Execution model
When backend runs in `apply` mode:
- patching runs in an isolated temporary workspace,
- verification hooks (`lint` / `typecheck` / `test`) run in isolated workspace,
- rollback is applied on failure paths when enabled,
- promotion back to main workspace is opt-in and validated (`promote_verified`),
- isolated workspace cleanup runs by default.

Main workspace mutations are only allowed through validated promotion.

## Required structured output
Backend output must satisfy `Agent Output Envelope` plus backend metrics fields:
- `metrics.changePlan[]`
- `metrics.targetFiles[]`
- `metrics.changeType`
- `metrics.requiresSchemaChange`
- `metrics.requiresArchitectureChange`
- `metrics.requiresMigration`
- `metrics.proposedDiffs[]`
- `metrics.testsPlan[]`
- `metrics.knownLimitations[]`

Each `metrics.proposedDiffs[]` entry must include:
- `filePath`
- `operation` (`create` | `update`)
- `content`

## Allowed change boundaries
Allowed target path prefixes:
- `apps/orchestrator-runner/src/`
- `apps/orchestrator-runner/test/`
- `docs/agents/`
- `docs/project/`

Allowed change types:
- `patch_only`
- `new_file`
- `test_focused_multi_file`
- `test_only`
- `docs_only`

Create constraints:
- at most one `create` operation per run,
- create path must be inside:
  - `apps/orchestrator-runner/src/`
  - `apps/orchestrator-runner/test/`
- create extension allowlist:
  - `.ts`
  - `.tsx`
  - `.md`
  - `.json` (helper-only constraints apply)
- create content size limits:
  - max `8000` bytes for any create file
  - max `2000` bytes for json helper files
- root-level and hidden-file creation are forbidden,
- config/schema/migration-like create filenames are forbidden,
- create operation fails if target already exists.

Json helper-file constraints:
- json helper create paths are only allowed under:
  - `apps/orchestrator-runner/test/fixtures/`

`test_focused_multi_file` constraints:
- max 3 target files,
- max 1 create operation,
- at least one test-related target file,
- at least one non-test implementation target file,
- single-root constraint remains mandatory.

## Forbidden mutations
Forbidden path prefixes:
- `configs/`
- `packages/agent-config/`
- `packages/orchestrator-core/`
- `.github/`
- `.changeset/`

Forbidden exact paths:
- `pnpm-lock.yaml`
- `package.json`
- `pnpm-workspace.yaml`
- `.env`
- `.env.example`

Also forbidden:
- schema changes (`requiresSchemaChange=true`)
- architecture changes (`requiresArchitectureChange=true`)
- migrations (`requiresMigration=true`)

## Safety validation rules
For completed backend output:
1. `metrics.targetFiles[]` must be present and non-empty.
2. Every target file must be in allowlisted paths.
3. `metrics.testsPlan[]` must be non-empty.
4. `metrics.proposedDiffs[]` must be non-empty and path-valid.
5. Every proposed diff file must exist in `targetFiles[]`.
6. `patch_only` may only use `update`.
7. `new_file` must include exactly one `create` and no extra updates.
8. `test_focused_multi_file` may include at most one `create`.
9. Create path/extension/name/size rules must pass policy checks.
10. Safety booleans must respect policy (`requiresSchemaChange`, `requiresArchitectureChange`, `requiresMigration`).

## Failure categories
Runtime failure categories include:
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
- `promotion_failure`
- `rollback_failed`

## Escalation rules
Backend must return `needs_escalation` when work requires:
- writing outside allowlisted paths,
- schema/model changes,
- architecture boundary changes,
- migrations,
- multi-package scope expansion,
- broader refactor outside allowed change types.

## Machine-readable contract locations
- Backend schema:
  - `apps/orchestrator-runner/src/adapters/live/schemas/backend-agent-response-schema.ts`
- Backend validation:
  - `apps/orchestrator-runner/src/adapters/live/validators/backend-safety-rules.ts`
  - `apps/orchestrator-runner/src/adapters/live/validators/assert-backend-output.ts`
- Stability checklist:
  - `docs/agents/backend-live-stability-checklist.md`
- Stability reassessment checklist:
  - `docs/agents/backend-live-stability-reassessment.md`
