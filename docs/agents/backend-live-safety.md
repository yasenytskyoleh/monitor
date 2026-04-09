# Backend Live Safety Contract

## Purpose
Define the safety contract that must be satisfied before enabling a future live `backend-agent`.

This document defines:
- allowed patch boundaries,
- required structured output shape,
- validation and escalation rules,
- forbidden mutations.

This contract is **active as design policy now**, while backend live execution remains disabled.

## Status
- backend live model execution: **not implemented**
- backend live safety contract: **defined**
- backend live validator modules: **implemented**

## Why this exists
Backend is a code-writing role. It can introduce hidden scope expansion and contract drift if unbounded.
The system must enforce deterministic boundaries before any live patch execution is enabled.

## Required structured output (future backend live)
Backend output must still satisfy `Agent Output Envelope`, plus backend metrics contract fields:

- `metrics.changePlan[]`
- `metrics.targetFiles[]`
- `metrics.changeType`
- `metrics.requiresSchemaChange`
- `metrics.requiresArchitectureChange`
- `metrics.requiresMigration`
- `metrics.proposedDiffs[]`
- `metrics.testsPlan[]`
- `metrics.knownLimitations[]`

`metrics.proposedDiffs[]` entries must include:
- `filePath`
- `operation` (`create` | `update`)
- `content`

No freeform “I changed things” output is acceptable.

## Allowed change boundaries (initial policy)
Allowed target path prefixes:
- `apps/orchestrator-runner/src/`
- `apps/orchestrator-runner/test/`
- `docs/agents/`
- `docs/project/`

Allowed change types:
- `patch_only`
- `test_only`
- `docs_only`

`new_file` is defined in schema for forward compatibility, but **disallowed by current policy**.

## Forbidden mutations (initial policy)
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

Also forbidden in current policy:
- schema changes (`requiresSchemaChange=true`)
- architecture changes (`requiresArchitectureChange=true`)
- migrations (`requiresMigration=true`)

If any forbidden change is needed, backend must escalate instead of producing a patch plan.

## Safety validation rules
For completed backend output:

1. `metrics.targetFiles[]` must be present and non-empty.
2. Every target file must be in allowlisted paths.
3. `metrics.testsPlan[]` must be non-empty.
4. `metrics.proposedDiffs[]` must be non-empty and path-valid.
5. Every proposed diff file must exist in `targetFiles[]`.
6. `patch_only` may only use `update` operations.
7. Non-`new_file` change types may not use `create`.
8. Safety booleans must respect policy (`requiresSchemaChange`, `requiresArchitectureChange`, `requiresMigration`).

## Escalation rules
Backend must return `needs_escalation` when task requires:
- writing outside allowlisted paths,
- schema/model changes,
- architecture boundary changes,
- migrations,
- multi-package scope expansion,
- broader refactor beyond allowed change type.

For `needs_escalation`, standard escalation envelope is mandatory.

## Machine-readable contract locations
- Backend response schema:
  - `apps/orchestrator-runner/src/adapters/live/schemas/backend-agent-response-schema.ts`
- Backend safety rules and validator:
  - `apps/orchestrator-runner/src/adapters/live/validators/backend-safety-rules.ts`
  - `apps/orchestrator-runner/src/adapters/live/validators/assert-backend-output.ts`

## Non-goal for this step
This contract does **not** enable live backend execution. It only defines and validates safe boundaries for future activation.
