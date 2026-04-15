# Approved Refinement Follow-Up Flow

## Happy path (first version)
1. persisted `ResearchDecisionApproval` exists with `approvalOutcome=approved`
2. `authorizedNextAction` is `refine_definition`
3. runtime constructs `CreateSetupRefinementRequestCommand`
4. refinement handoff validates approval/setup/feedback linkage and action
5. `ResearchService.createRefinementRequest(...)` is called
6. persisted `SetupRefinementRequest` is created with `status=proposed`
7. result returns setup id, refinement request id, and request status

Coordinator:
- `createApprovedRefinementFollowUpHandoff`
- `packages/domain-model/src/runtime-handoff/approved-refinement-follow-up.ts`

## Failure boundaries
- missing approval -> `rejected_validation`
- approval outcome not `approved` -> `rejected_lifecycle`
- authorized action not `refine_definition` -> `rejected_lifecycle`
- command action not `refine_definition` -> `rejected_validation`
- missing setup definition -> `rejected_validation`
- request creation/persistence failure -> `failed`

## Manual-first rule
- refinement follow-up is explicit and request-driven
- refinement request does not mutate setup content automatically
- no setup patching/versioning is performed in this PR

## Postponed work
- setup-definition content mutation engine
- refinement execution workflow/queue
- reviewer UI and assignment automation
- automatic refinement completion/closure
