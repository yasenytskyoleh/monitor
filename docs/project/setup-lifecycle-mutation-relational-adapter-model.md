# Setup Lifecycle Mutation Relational Adapter Model

## Purpose
Define the repository-adapter rollout contract for `setup_lifecycle_mutation_record`.

This step formalizes:
- repository-to-adapter boundaries
- deterministic persistence-error mapping
- reference validation responsibilities

for the mutation-audit slice with committed physical schema artifacts.

The executable repository rollout on top of this contract is completed later in:
- `docs/project/setup-lifecycle-mutation-relational-rollout-model.md`
- `docs/architecture/adr/ADR-059-setup-lifecycle-mutation-record-adapter-backed-relational-repositories.md`

## Contract sources
- `packages/domain-model/src/repositories/setup-lifecycle-mutation-record-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/setup-lifecycle-mutation-record-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/repository-error.ts`
- `packages/domain-model/src/storage/setup-lifecycle-mutation-record-relational-slice.ts`
- `packages/domain-model/src/storage/setup-lifecycle-mutation-record-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/test/setup-lifecycle-mutation-record-relational-repository-adapter-contracts.test.ts`
- `docs/architecture/adr/ADR-058-setup-lifecycle-mutation-record-relational-adapter-contract.md`

## Boundary model
Direction:
- service -> repository -> relational adapter -> physical relational storage

Rules:
1. `SetupDefinitionService` continues to own approved-mutation write semantics
2. the relational repository remains domain-facing
3. the adapter operates on durable setup-lifecycle-mutation records and reference validation at the persistence boundary
4. physical table layout stays behind the durable-record and error contracts

## Adapter operation contract
Adapter operations:
- `loadSetupLifecycleMutationRecord`
- `listSetupLifecycleMutationRecordsBySetupDefinitionId`
- `listSetupLifecycleMutationRecordsByResearchDecisionApprovalId`
- `insertSetupLifecycleMutationRecord`

Repository mapping:
- repository `getById` -> adapter `load`
- repository `listBySetupDefinitionId` -> adapter `listBySetupDefinitionId`
- repository `listByApprovalId` -> adapter `listByResearchDecisionApprovalId`
- repository `create` -> repository dehydrates one durable record, then adapter `insert`

No update operation is defined in this step because the current setup-lifecycle-mutation-record repository is create-only.

## Deterministic persistence-error mapping
Deterministic adapter error codes for the mutation-audit slice:
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
- consistency between the referenced approval and the record's `researchFeedbackDecisionId`
- consistency between the referenced feedback decision and the record's `setupDefinitionId`

This contract intentionally does not attempt to validate:
- approval outcome authorization
- approved-action correspondence with the referenced approval record
- lifecycle transition legality between `previousStatus` and `newStatus`

Those remain service-owned business rules rather than persistence-boundary reference checks in this step.

## Explicitly postponed at this contract step
- domain/durable mappers, adapter-backed relational repository implementation, and concrete Prisma adapter wiring are completed later in:
  - `docs/project/setup-lifecycle-mutation-relational-rollout-model.md`
  - `docs/architecture/adr/ADR-059-setup-lifecycle-mutation-record-adapter-backed-relational-repositories.md`
- shared implemented-product bundle extension through `setup_lifecycle_mutation_record` is completed later in:
  - `docs/project/implemented-product-setup-lifecycle-mutation-composition-model.md`
  - `docs/architecture/adr/ADR-060-implemented-product-setup-lifecycle-mutation-composition.md`
- opt-in real-Postgres integration coverage through `setup_lifecycle_mutation_record` is completed later in:
  - `docs/project/implemented-product-setup-lifecycle-mutation-integration-model.md`
  - `docs/architecture/adr/ADR-061-implemented-product-setup-lifecycle-mutation-integration-coverage.md`
- runtime review/execution engines
