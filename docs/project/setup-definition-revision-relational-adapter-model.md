# Setup Definition Revision Relational Adapter Model

## Purpose
Define the repository-adapter rollout contract for `setup_definition_revision`.

This step formalizes:
- repository-to-adapter boundaries
- deterministic persistence-error mapping
- revision-lineage and reference-validation responsibilities

for the revision slice with committed physical schema artifacts.

The executable repository rollout on top of this contract is now documented separately in `docs/project/setup-definition-revision-relational-rollout-model.md`.

## Contract sources
- `packages/domain-model/src/repositories/setup-definition-revision-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/setup-definition-revision-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/repository-error.ts`
- `packages/domain-model/src/storage/setup-definition-revision-relational-slice.ts`
- `packages/domain-model/src/storage/setup-definition-revision-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/test/setup-definition-revision-relational-repository-adapter-contracts.test.ts`
- `docs/architecture/adr/ADR-070-setup-definition-revision-relational-adapter-contract.md`

## Boundary model
Direction:
- service -> repository -> relational adapter -> physical relational storage

Rules:
1. `SetupDefinitionService` continues to own revision-creation and status-transition business semantics
2. the relational repository remains domain-facing
3. the adapter operates on durable setup-definition-revision records and reference validation at the persistence boundary
4. physical table layout stays behind the durable-record and error contracts

## Adapter operation contract
Adapter operations:
- `loadSetupDefinitionRevisionRecord`
- `loadSetupDefinitionRevisionRecordBySetupDefinitionId`
- `loadLatestSetupDefinitionRevisionRecordBySetupFamilyId`
- `listSetupDefinitionRevisionRecordsBySetupFamilyId`
- `insertSetupDefinitionRevisionRecord`
- `updateSetupDefinitionRevisionRecord`

Repository mapping:
- repository `getById` -> adapter `loadSetupDefinitionRevisionRecord`
- repository `getBySetupDefinitionId` -> adapter `loadSetupDefinitionRevisionRecordBySetupDefinitionId`
- repository `getLatestBySetupFamilyId` -> adapter `loadLatestSetupDefinitionRevisionRecordBySetupFamilyId`
- repository `listBySetupFamilyId` -> adapter `listSetupDefinitionRevisionRecordsBySetupFamilyId`
- repository `create` -> repository dehydrates one durable record, then adapter `insert`
- repository `updateStatus` -> repository writes one updated durable record through adapter `update`

## Deterministic persistence-error mapping
Deterministic adapter error codes for the revision slice:
- `already_exists`
- `not_found`
- `version_mismatch`
- `invalid_reference`

Retryable adapter error codes:
- `transient_failure`
- `unknown_failure`

Expected contract-level mapping:
- duplicate revision id on create -> `already_exists`
- missing revision id on update -> `not_found`
- stale optimistic version on update -> `version_mismatch`
- missing referenced `setup_definition` -> `invalid_reference`
- missing referenced `setup_refinement_request` -> `invalid_reference`
- missing referenced optional approval/feedback lineage -> `invalid_reference`
- mismatched refinement-request/setup lineage -> `invalid_reference`
- mismatched approval/feedback/setup lineage -> `invalid_reference`

## Reference validation scope
This adapter contract validates:
- new `setup_definition` existence
- optional `previous_setup_definition` existence
- `source_setup_refinement_request` existence
- optional approval existence
- optional feedback-decision existence
- source refinement request linkage back to the previous setup when provided
- optional approval/feedback ids against the source refinement request lineage
- approval/setup and approval/feedback consistency
- feedback-decision/setup consistency

This contract intentionally does not validate:
- revision status-transition legality
- setup-family/version sequencing rules beyond repository optimistic version semantics
- approval outcome authorization or later activation workflow rules

Those remain service-owned business rules rather than persistence-boundary checks in this step.

## Explicitly postponed at this contract step
- shared implemented-product bundle extension through `setup_definition_revision`, completed later in `docs/project/implemented-product-setup-definition-revision-composition-model.md`
- opt-in real-Postgres integration coverage through `setup_definition_revision`, completed later in `docs/project/implemented-product-setup-definition-revision-integration-model.md`
- later downstream activation-record persistence
