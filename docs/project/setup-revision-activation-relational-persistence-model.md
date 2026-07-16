# Setup Revision Activation Relational Persistence Model

## Purpose
Define the durable relational contract and physical schema for `SetupRevisionActivationRecord` as the next downstream activation-audit persistence slice after `setup_definition_revision`.

This step stays narrow:
- logical durable record contract
- activation lineage and explicit outcome audit semantics
- committed Prisma schema
- committed SQL migration

The repository adapter contract, executable repository rollout, and shared-bundle extension are now documented separately, while opt-in real-database integration extension still remains later work.

## Implemented artifact locations
- `packages/domain-model/src/storage/setup-revision-activation-record-relational-slice.ts`
- `packages/domain-model/src/storage/setup-revision-activation-record-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260711103000_product_domain_setup_revision_activation_record_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repositories.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-prisma-client.ts`
- `packages/domain-model/src/review/setup-revision-activation-record.ts`
- `packages/domain-model/src/services/setup-definition-service.ts`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/prisma-physical-schema-contracts.test.ts`
- `packages/domain-model/test/setup-revision-activation-record-relational-repository-adapter-contracts.test.ts`
- `packages/domain-model/test/setup-revision-activation-record-relational-repository-mappers.test.ts`
- `packages/domain-model/test/setup-revision-activation-record-relational-repositories.test.ts`
- `packages/domain-model/test/setup-revision-activation-record-relational-prisma-adapter.test.ts`
- `docs/project/setup-revision-activation-model.md`
- `docs/project/setup-revision-activation-relational-adapter-model.md`
- `docs/project/setup-revision-activation-relational-rollout-model.md`
- `docs/architecture/adr/ADR-017-setup-definition-revision-activation-and-superseding.md`
- `docs/architecture/adr/ADR-074-setup-revision-activation-record-durable-relational-contract.md`
- `docs/architecture/adr/ADR-075-setup-revision-activation-record-prisma-schema-layout.md`
- `docs/architecture/adr/ADR-076-setup-revision-activation-record-relational-adapter-contract.md`
- `docs/architecture/adr/ADR-077-setup-revision-activation-record-adapter-backed-relational-repositories.md`

## Durable record shape
`SetupRevisionActivationRecordDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema-version fields
- required `setupFamilyId`
- required `targetRevisionId`
- required `targetSetupDefinitionId`
- nullable `previousRevisionId`
- nullable `previousSetupDefinitionId`
- required `activatedBy`
- required `activatedAtUtc`
- required `activationOutcome`
- nullable `rationale`

`identity.entityId` remains the durable activation audit id, while the explicit setup-family, target-revision, and target-setup fields keep runtime resolution and audit queries independent from later reconstruction logic.

## Reference and mapping rules
- `setupFamilyId` is stored explicitly even though it is derivable from the target revision, because the activation audit is queried directly by family during runtime resolution
- `targetRevisionId` is the accepted `SetupDefinitionRevision` that became operationally current
- `targetSetupDefinitionId` is the durable setup definition made active by that activation
- `previousRevisionId` and `previousSetupDefinitionId` stay nullable because first activation and some fallback superseding paths do not always carry both references
- `activationOutcome` remains explicit because the audit record must preserve whether the action was a fresh activation, a superseding activation, or an already-active no-op audit
- `activatedAtUtc` preserves the explicit operational selection timestamp rather than inferring it from record creation time alone

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- repository optimistic version starts at `identity.version = 1`
- the current activation-audit repository is create-only, so this step defines immutable create semantics rather than an update lifecycle
- persistence does not infer activation eligibility, target-family consistency, previous-active linkage correctness, or accepted-revision status; the setup-definition service remains the source of those business rules

## Physical schema rules
The migration now enforces:
- positive repository version
- non-empty setup-family, target-revision, target-setup, and activated-by fields
- non-empty optional previous-revision, previous-setup, and rationale fields when present
- `previous_setup_definition_id <> target_setup_definition_id` when a previous setup exists
- `previous_revision_id <> target_revision_id` when a previous revision exists
- activation timestamp consistency with created/updated timestamps
- `updated_at_utc >= created_at_utc`
- archived timestamp consistency with lifecycle status

## Reference policy
Physical FKs are enforced for:
- `target_revision_id`
- `target_setup_definition_id`
- `previous_revision_id` when present
- `previous_setup_definition_id` when present

Still service-owned rather than encoded as compound relational constraints in this step:
- verifying that `targetRevisionId` belongs to `setupFamilyId`
- verifying that `targetSetupDefinitionId` matches the target revision
- verifying that optional previous revision/setup lineage reflects the actual previously active state
- verifying that `activationOutcome` matches the service-level activation path taken
- verifying that the target revision is eligible for activation

## What remains pending
- shared implemented-product bundle extension through `setup_revision_activation_record` is completed later in `docs/project/implemented-product-setup-revision-activation-composition-model.md`
- later opt-in real-Postgres integration extension through `setup_revision_activation_record` is completed later in `docs/project/implemented-product-setup-revision-activation-integration-model.md`
- later execution/mutation durable slices after `setup_revision_activation_record`
- exchange ingestion, runtime engines, and UI
