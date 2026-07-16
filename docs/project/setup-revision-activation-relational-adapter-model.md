# Setup Revision Activation Relational Adapter Model

## Purpose
Define the repository-adapter rollout contract for `setup_revision_activation_record`.

This step formalizes:
- repository-to-adapter boundaries
- deterministic persistence-error mapping
- activation-lineage reference validation at the persistence boundary

for the activation-audit slice with committed physical schema artifacts.

The executable repository rollout and shared implemented-product bundle extension are now completed separately in:
- `docs/project/setup-revision-activation-relational-rollout-model.md`
- `docs/project/implemented-product-setup-revision-activation-composition-model.md`

## Contract sources
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/repository-error.ts`
- `packages/domain-model/src/storage/setup-revision-activation-record-relational-slice.ts`
- `packages/domain-model/src/storage/setup-revision-activation-record-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/test/setup-revision-activation-record-relational-repository-adapter-contracts.test.ts`
- `docs/architecture/adr/ADR-076-setup-revision-activation-record-relational-adapter-contract.md`

## Boundary model
Direction:
- service -> repository -> relational adapter -> physical relational storage

Rules:
1. `SetupDefinitionService` continues to own revision-activation business semantics
2. the relational repository remains domain-facing
3. the adapter operates on durable activation-audit records plus persistence-boundary reference validation
4. physical table layout stays behind the durable-record and error contracts

## Adapter operation contract
Adapter operations:
- `loadSetupRevisionActivationRecord`
- `listSetupRevisionActivationRecordsBySetupFamilyId`
- `listSetupRevisionActivationRecordsByTargetRevisionId`
- `insertSetupRevisionActivationRecord`

Repository mapping:
- repository `getById` -> adapter `loadSetupRevisionActivationRecord`
- repository `listBySetupFamilyId` -> adapter `listSetupRevisionActivationRecordsBySetupFamilyId`
- repository `listByTargetRevisionId` -> adapter `listSetupRevisionActivationRecordsByTargetRevisionId`
- repository `create` -> repository dehydrates one durable record, then adapter `insert`

No update operation is defined in this step because the current activation-audit repository is create-only.

## Deterministic persistence-error mapping
Deterministic adapter error codes for the activation-audit slice:
- `already_exists`
- `invalid_reference`

Retryable adapter error codes:
- `transient_failure`
- `unknown_failure`

Expected contract-level mapping:
- duplicate activation-record id on create -> `already_exists`
- missing referenced target `setup_definition_revision` -> `invalid_reference`
- missing referenced target `setup_definition` -> `invalid_reference`
- missing referenced optional previous `setup_definition_revision` -> `invalid_reference`
- missing referenced optional previous `setup_definition` -> `invalid_reference`
- target revision/setup-family mismatch -> `invalid_reference`
- target revision/setup-definition mismatch -> `invalid_reference`
- optional previous revision/setup-family mismatch -> `invalid_reference`
- optional previous revision/previous-setup mismatch -> `invalid_reference`
- repeated previous/target revision or setup lineage -> `invalid_reference`

## Reference validation scope
This adapter contract validates:
- target `setup_definition_revision` existence
- target `setup_definition` existence
- optional previous `setup_definition_revision` existence
- optional previous `setup_definition` existence
- target revision linkage back to the persisted `setupFamilyId`
- target revision linkage back to the persisted `targetSetupDefinitionId`
- optional previous revision linkage back to the same `setupFamilyId`
- optional previous revision linkage back to the persisted `previousSetupDefinitionId` when provided
- previous revision and setup ids remain distinct from target lineage ids

This contract intentionally does not validate:
- target revision activation eligibility
- whether the optional previous lineage reflects the actual previously active setup
- `activationOutcome` correctness relative to the service path taken
- setup status transitions or revision superseding semantics

Those remain service-owned business rules rather than persistence-boundary checks in this step.

## Explicitly postponed at this contract step
- shared implemented-product bundle extension through `setup_revision_activation_record` is completed later in `docs/project/implemented-product-setup-revision-activation-composition-model.md`
- opt-in real-Postgres integration coverage through `setup_revision_activation_record`
- later downstream execution/mutation durable slices after `setup_revision_activation_record`
- runtime review/execution engines
