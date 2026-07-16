# Setup Definition Revision Relational Persistence Model

## Purpose
Define the durable relational contract and physical schema for `SetupDefinitionRevision` as the next downstream revision persistence slice after `setup_refinement_request`.

This step stays narrow:
- logical durable record contract
- revision lineage and setup-family/version semantics
- committed Prisma schema
- committed SQL migration

The repository adapter contract, executable repository rollout, shared-bundle extension, and opt-in real-database integration for this entity are now documented separately.

## Implemented artifact locations
- `packages/domain-model/src/storage/setup-definition-revision-relational-slice.ts`
- `packages/domain-model/src/storage/setup-definition-revision-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260708101500_product_domain_setup_definition_revision_relational_v1/migration.sql`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/prisma-physical-schema-contracts.test.ts`
- `docs/project/setup-definition-revision-relational-adapter-model.md`
- `docs/architecture/adr/ADR-068-setup-definition-revision-durable-relational-contract.md`
- `docs/architecture/adr/ADR-069-setup-definition-revision-prisma-schema-layout.md`
- `docs/architecture/adr/ADR-070-setup-definition-revision-relational-adapter-contract.md`
- `docs/project/setup-definition-revision-relational-rollout-model.md`
- `docs/architecture/adr/ADR-071-setup-definition-revision-adapter-backed-relational-repositories.md`
- `docs/project/implemented-product-setup-definition-revision-composition-model.md`
- `docs/project/implemented-product-setup-definition-revision-integration-model.md`
- `docs/architecture/adr/ADR-072-implemented-product-setup-definition-revision-composition.md`
- `docs/architecture/adr/ADR-073-implemented-product-setup-definition-revision-integration-coverage.md`

## Durable record shape
`SetupDefinitionRevisionDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema-version fields
- required `setupDefinitionId`
- nullable `previousSetupDefinitionId`
- required `setupFamilyId`
- required `setupVersionNumber`
- nullable `previousRevisionId`
- required `revisionReason`
- required `revisionStatus`
- required `changedFieldsSummary`
- required `createdBy`
- nullable `notes`
- required `sourceSetupRefinementRequestId`
- nullable `sourceResearchDecisionApprovalId`
- nullable `sourceResearchFeedbackDecisionId`

`identity.entityId` remains the durable revision id, while `setupVersionNumber` preserves the explicit domain revision number inside the setup-family chain.

## Reference and mapping rules
- `setupDefinitionId` is the new draft setup definition produced by revision creation
- `previousSetupDefinitionId` points to the superseded setup definition when one exists
- `setupFamilyId` groups all revisions in one immutable setup lineage
- `setupVersionNumber` maps directly to `SetupDefinitionRevision.versionInfo.version`
- `previousRevisionId` maps directly to `SetupDefinitionRevision.versionInfo.previousRevisionId`
- `sourceSetupRefinementRequestId` is required because the current revision path is explicitly refinement-driven
- `sourceResearchDecisionApprovalId` and `sourceResearchFeedbackDecisionId` stay nullable in storage because the domain contract keeps them optional, even though the current service path usually populates both

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- repository optimistic version starts at `identity.version = 1`
- `setupVersionNumber` must stay positive and unique inside a `setupFamilyId`
- one revision record maps to exactly one `setupDefinitionId`
- this step defines the durable contract and physical schema only; repository status-update semantics remain pending with the later adapter/repository rollout

## Physical schema rules
The migration now enforces:
- positive repository version
- non-empty setup ids, setup family id, revision reason, changed-fields summary, created-by, and source refinement-request id
- positive `setup_version_number`
- non-empty optional previous/setup-lineage ids when present
- `previous_setup_definition_id <> setup_definition_id` when a previous setup exists
- `updated_at_utc >= created_at_utc`
- archived timestamp consistency with lifecycle status
- unique `setup_definition_id`
- unique (`setup_family_id`, `setup_version_number`)

## Reference policy
Physical FKs are enforced for:
- `setup_definition_id`
- `previous_setup_definition_id`
- `source_setup_refinement_request_id`
- `source_research_decision_approval_id` when present
- `source_research_feedback_decision_id` when present

Still service-owned rather than encoded as compound relational constraints in this step:
- verifying that `source_setup_refinement_request_id` belongs to `previousSetupDefinitionId`
- verifying revision-chain continuity between `previousRevisionId`, `setupFamilyId`, and `setupVersionNumber`
- verifying that optional approval/feedback lineage matches the refinement request
- revision-status transition legality

## What remains pending
- later downstream `setup_revision_activation_record` repository/shared-bundle/integration rollout, with durable contract/schema documented in `docs/project/setup-revision-activation-relational-persistence-model.md` and adapter contract documented in `docs/project/setup-revision-activation-relational-adapter-model.md`
- subsequent downstream execution/mutation durable slices after `setup_revision_activation_record`
- exchange ingestion, runtime engines, and UI
