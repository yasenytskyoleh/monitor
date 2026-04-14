# ADR-014: Approved Setup Lifecycle Mutation Path

## Status
Accepted

## Context
After ADR-013, Monitor can persist `ResearchDecisionApproval` outcomes for `ResearchFeedbackDecision` recommendations.

The next missing boundary is how an approved recommendation is applied to `SetupDefinition` lifecycle state in a controlled, auditable way.

Without this boundary, the loop still stops at approval and cannot close with an explicit setup mutation path.

## Decision
Introduce an approved lifecycle mutation handoff contract:
- input: `ApplyApprovedSetupMutationCommand`
- output: `SetupLifecycleMutationResult`
- mutation audit artifact: `SetupLifecycleMutationRecord`
- coordinator: `createApprovedSetupLifecycleMutationHandoff`
- service entrypoint: `SetupDefinitionService.applyApprovedMutation(...)`

## Allowed actions and target statuses (first version)
Allowed actions:
- `keep_active`
- `pause_setup`
- `archive_setup`

Target status mapping:
- `keep_active` -> `active`
- `pause_setup` -> `paused`
- `archive_setup` -> `archived`

## Legal lifecycle transitions (first version)
- `draft` -> `active`
- `active` -> `paused`
- `active` -> `archived`
- `paused` -> `active`
- `paused` -> `archived`

All other transitions are rejected.

## Ownership boundary
Approval side owns:
- whether outcome is `approved`
- which action is authorized (`authorizedNextAction`)

Setup-definition service owns:
- transition legality checks
- applying setup status change
- persisting setup mutation audit records

Research side does not directly mutate setup lifecycle post-approval.

## Failure policy
- missing approval/setup -> `rejected_validation`
- approval outcome not `approved` -> `rejected_lifecycle`
- approval/setup linkage mismatch -> `rejected_validation`
- action not allowed or transition invalid -> `rejected_validation`
- unexpected mutation path/runtime error -> `failed` with retry warning

No background worker, queue, or policy engine is introduced in this slice.

## Consequences
Positive:
- explicit approval-to-mutation boundary is now defined
- setup lifecycle updates are auditable through mutation records
- fail-closed behavior remains explicit and deterministic

Trade-offs:
- lifecycle-only mutation scope in this version
- refinement/content rewrites remain out of scope

## Explicitly postponed
- automatic setup-definition content rewrites
- automatic hypothesis closure
- refinement workflow engine
- reviewer UI/dashboard
- background mutation orchestration
- full governance/automation policy engine
