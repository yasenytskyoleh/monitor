# Setup Refinement Request Relational Adapter Model

## Purpose
Define the repository-adapter rollout contract for `setup_refinement_request`.

This step formalizes:
- repository-to-adapter boundaries
- deterministic persistence-error mapping
- reference validation responsibilities

for the refinement-follow-up slice with committed physical schema artifacts.

The executable repository rollout on top of this contract is completed later in:
- `docs/project/setup-refinement-request-relational-rollout-model.md`
- `docs/architecture/adr/ADR-065-setup-refinement-request-adapter-backed-relational-repositories.md`

## Contract sources
- `packages/domain-model/src/repositories/setup-refinement-request-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/setup-refinement-request-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/repository-error.ts`
- `packages/domain-model/src/storage/setup-refinement-request-relational-slice.ts`
- `packages/domain-model/src/storage/setup-refinement-request-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/test/setup-refinement-request-relational-repository-adapter-contracts.test.ts`
- `docs/architecture/adr/ADR-064-setup-refinement-request-relational-adapter-contract.md`

## Boundary model
Direction:
- service -> repository -> relational adapter -> physical relational storage

Rules:
1. `ResearchService` continues to own refinement-request creation semantics
2. the relational repository remains domain-facing
3. the adapter operates on durable setup-refinement-request records and reference validation at the persistence boundary
4. physical table layout stays behind the durable-record and error contracts

## Adapter operation contract
Adapter operations:
- `loadSetupRefinementRequest`
- `listSetupRefinementRequestsBySetupDefinitionId`
- `listSetupRefinementRequestsByResearchDecisionApprovalId`
- `insertSetupRefinementRequest`

Repository mapping:
- repository `getById` -> adapter `load`
- repository `listBySetupDefinitionId` -> adapter `listBySetupDefinitionId`
- repository `listByApprovalId` -> adapter `listByResearchDecisionApprovalId`
- repository `create` -> repository dehydrates one durable record, then adapter `insert`

No update operation is defined in this step because the current setup-refinement-request repository is create-only.

## Deterministic persistence-error mapping
Deterministic adapter error codes for the refinement-follow-up slice:
- `already_exists`
- `invalid_reference`

Retryable adapter error codes:
- `transient_failure`
- `unknown_failure`

Expected physical-to-contract mapping:
- unique/primary key conflict on create -> `already_exists`
- missing referenced `setup_definition` -> `invalid_reference`
- missing referenced `research_decision_approval` -> `invalid_reference`
- missing referenced `research_feedback_decision` -> `invalid_reference`
- referenced approval/setup mismatch -> `invalid_reference`
- referenced approval/feedback mismatch -> `invalid_reference`
- referenced feedback-decision/setup mismatch -> `invalid_reference`
- connection interruption, lock timeout, deadlock, serialization retry class -> `transient_failure`
- uncategorized persistence failure -> `unknown_failure`

## Reference validation scope
This adapter contract expects:
- `setup_definition` existence
- `research_decision_approval` existence
- `research_feedback_decision` existence
- consistency between the referenced approval and the record's `setupDefinitionId`
- consistency between the referenced approval and the record's `sourceResearchFeedbackDecisionId`
- consistency between the referenced feedback decision and the record's `setupDefinitionId`

This contract intentionally does not attempt to validate:
- approval outcome authorization
- `authorizedNextAction = refine_definition`
- later assignment/status workflow legality

Those remain service-owned business rules rather than persistence-boundary reference checks in this step.

## Explicitly postponed at this contract step
- domain/durable mappers, adapter-backed relational repository implementation, and concrete Prisma adapter wiring are completed later in:
  - `docs/project/setup-refinement-request-relational-rollout-model.md`
  - `docs/architecture/adr/ADR-065-setup-refinement-request-adapter-backed-relational-repositories.md`
- shared implemented-product bundle extension through `setup_refinement_request`
- opt-in real-Postgres integration coverage through `setup_refinement_request`
- runtime review/execution engines
