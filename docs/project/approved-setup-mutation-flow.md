# Approved Setup Mutation Flow

## Happy path (first version)
1. persisted `ResearchDecisionApproval` exists with `approvalOutcome=approved`
2. runtime builds `ApplyApprovedSetupMutationCommand`
3. mutation handoff validates approval/setup/action linkage
4. `SetupDefinitionService.applyApprovedMutation(...)` is called
5. setup lifecycle transition is validated against allowed transitions
6. setup status is updated
7. `SetupLifecycleMutationRecord` is persisted
8. result returns setup id, previous status, new status, and mutation id

Coordinator:
- `createApprovedSetupLifecycleMutationHandoff`
- `packages/domain-model/src/runtime-handoff/approved-setup-lifecycle-mutation.ts`

## Failure boundaries
- missing approval -> `rejected_validation`
- approval outcome not `approved` -> `rejected_lifecycle`
- missing setup definition -> `rejected_validation`
- approval/setup/feedback mismatch -> `rejected_validation`
- approved action mismatch -> `rejected_validation`
- invalid status transition -> `rejected_validation`
- unexpected persistence/runtime failure -> `failed` with retry warning

## Gated mutation rule
- recommendation and approval are separate from mutation execution
- approval is required but not sufficient alone; setup service still enforces legal transitions
- only lifecycle status mutation is allowed in this slice
- setup-definition content rewrite is postponed

## Postponed work
- setup-definition content rewrite from approved decisions
- automatic refinement planning
- automatic hypothesis closure from mutation outcomes
- queue/worker orchestration for mutation jobs
