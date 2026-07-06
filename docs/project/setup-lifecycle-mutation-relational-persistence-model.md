# Setup Lifecycle Mutation Relational Persistence Model

## Purpose
Define the durable relational contract and physical schema for `SetupLifecycleMutationRecord` as the storage foundation now used by the executable adapter-backed repository rollout.

This keeps the first downstream mutation-audit persistence slice narrow:
- logical durable record contract
- setup / approval / feedback reference rules
- status-action audit storage rules
- versioning semantics
- deterministic repository failure expectations
- Prisma schema
- SQL migration

while leaving the shared implemented-product bundle extension and opt-in real-Postgres integration follow-up for a later step.

## Implemented artifact locations
- `packages/domain-model/src/storage/setup-lifecycle-mutation-record-relational-slice.ts`
- `packages/domain-model/src/storage/setup-lifecycle-mutation-record-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260706113000_product_domain_setup_lifecycle_mutation_record_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/setup-lifecycle-mutation-record-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/setup-lifecycle-mutation-record-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/setup-lifecycle-mutation-record-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/setup-lifecycle-mutation-record-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/setup-lifecycle-mutation-record-relational-repositories.ts`
- `packages/domain-model/src/repositories/setup-lifecycle-mutation-record-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/setup-lifecycle-mutation-record-relational-prisma-client.ts`
- `packages/domain-model/src/review/setup-lifecycle-mutation-record.ts`
- `packages/domain-model/src/services/setup-definition-service.ts`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/prisma-physical-schema-contracts.test.ts`
- `packages/domain-model/test/setup-lifecycle-mutation-record-relational-repository-adapter-contracts.test.ts`
- `packages/domain-model/test/setup-lifecycle-mutation-record-relational-repository-mappers.test.ts`
- `packages/domain-model/test/setup-lifecycle-mutation-record-relational-repositories.test.ts`
- `packages/domain-model/test/setup-lifecycle-mutation-record-relational-prisma-adapter.test.ts`
- `docs/architecture/adr/ADR-056-setup-lifecycle-mutation-record-durable-relational-contract.md`
- `docs/architecture/adr/ADR-057-setup-lifecycle-mutation-record-prisma-schema-layout.md`
- `docs/architecture/adr/ADR-058-setup-lifecycle-mutation-record-relational-adapter-contract.md`
- `docs/project/setup-lifecycle-mutation-relational-rollout-model.md`
- `docs/architecture/adr/ADR-059-setup-lifecycle-mutation-record-adapter-backed-relational-repositories.md`

## Durable record shape
`SetupLifecycleMutationRecordDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema version fields
- required `setupDefinitionId`
- required `researchDecisionApprovalId`
- required `researchFeedbackDecisionId`
- `previousStatus`
- `newStatus`
- `approvedAction`
- `mutatedBy`
- `mutatedAtUtc`
- nullable `notes`

Optional domain fields are normalized to nullable durable fields rather than omitted storage keys.

## Reference and mapping rules
- `setupDefinitionId` is required and identifies the durable setup whose lifecycle changed
- `researchDecisionApprovalId` is required and identifies the approved manual decision that authorized the mutation
- `researchFeedbackDecisionId` is required and identifies the feedback decision lineage behind that approval
- all three references are now enforced as physical FKs because those upstream entities already exist as durable relational product entities
- `previousStatus` and `newStatus` are stored explicitly because this record is an immutable mutation audit artifact, not a derived reconstruction from later setup state
- `approvedAction` remains explicit even though it correlates with `newStatus`, because the audit record must preserve the approved human action semantics, not only the resulting lifecycle value
- `mutatedBy` and `mutatedAtUtc` remain explicit durable fields because the write path is an auditable service-owned mutation, not an implicit persistence side effect
- `createdAt` and `updatedAt` map directly to durable timestamps
- `ProductRecordMetadata` remains attached to the durable product record and is not replaced by orchestration evidence artifacts

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- create starts at `identity.version = 1`
- the current setup-lifecycle-mutation-record repository is create-only, so this step defines immutable create semantics rather than an update lifecycle
- persistence does not infer lifecycle-transition legality, approval eligibility, or approval/action correspondence; the setup-definition service remains the source of those business rules
- if later mutation-state updates are introduced, they must use the same optimistic version boundary as the other durable product entities

## Deterministic repository failure expectations
- duplicate create -> `already_exists`
- missing setup / approval / feedback references -> `invalid_reference`
- invalid approval/setup/feedback cross-linkage -> `invalid_reference`
- invalid lifecycle transition semantics -> rejected before persistence by the setup-definition service flow
- missing reads remain `null` / empty-list semantics at the repository boundary

## Physical schema rules
The migration now enforces:
- positive version
- non-empty `setup_definition_id`
- non-empty `research_decision_approval_id`
- non-empty `research_feedback_decision_id`
- non-empty `mutated_by`
- non-empty `notes` when present
- current approved-action semantics:
  - `keep_active -> active`
  - `pause_setup -> paused`
  - `archive_setup -> archived`
- mutation timestamp consistency with created/updated timestamps
- `updated_at_utc >= created_at_utc`
- archived timestamp consistency with lifecycle status

## Reference policy
Physical FKs are enforced for:
- `setup_definition_id`
- `research_decision_approval_id`
- `research_feedback_decision_id`

Still service-owned rather than encoded as compound relational constraints in this step:
- verifying that `approvedAction` matches the approved action on the referenced approval record
- verifying that the referenced approval outcome authorizes the mutation
- verifying that `previousStatus` and `newStatus` are legal for the current setup lifecycle state

Adapter-level lineage validation now also enforces:
- approval -> feedback consistency
- approval -> setup consistency
- feedback -> setup consistency

## Physical layout summary
Database schema:
- `product_domain`

Tables:
- `setup_lifecycle_mutation_record`

Enum families:
- `approved_setup_lifecycle_action`
- reused `setup_definition_status`
- reused `persisted_lifecycle_status`
- reused `product_record_source`

## What remains pending
- repository adapter contract and deterministic error mapping for `setup_lifecycle_mutation_record` are completed in:
  - `docs/project/setup-lifecycle-mutation-relational-adapter-model.md`
  - `docs/architecture/adr/ADR-058-setup-lifecycle-mutation-record-relational-adapter-contract.md`
- domain/durable mappers, adapter-backed relational repository, and concrete Prisma adapter wiring for `setup_lifecycle_mutation_record` are completed in:
  - `docs/project/setup-lifecycle-mutation-relational-rollout-model.md`
  - `docs/architecture/adr/ADR-059-setup-lifecycle-mutation-record-adapter-backed-relational-repositories.md`
- later shared implemented-product bundle and opt-in real-Postgres integration extension through `setup_lifecycle_mutation_record`
- later execution/mutation durable slices after `setup_lifecycle_mutation_record`
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
