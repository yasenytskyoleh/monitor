# Setup Refinement Request Relational Persistence Model

## Purpose
Define the durable relational contract and physical schema for `SetupRefinementRequest` as the first later downstream refinement-follow-up persistence slice after `setup_lifecycle_mutation_record`.

This step stays narrow:
- logical durable record contract
- setup / approval / feedback lineage rules
- refinement-request audit field normalization
- versioning semantics
- Prisma schema
- SQL migration

The repository adapter contract and executable repository rollout on top of these artifacts are now defined separately, while shared bundle/integration extension remains later work.

## Implemented artifact locations
- `packages/domain-model/src/storage/setup-refinement-request-relational-slice.ts`
- `packages/domain-model/src/storage/setup-refinement-request-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260706143000_product_domain_setup_refinement_request_relational_v1/migration.sql`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/prisma-physical-schema-contracts.test.ts`
- `docs/architecture/adr/ADR-062-setup-refinement-request-durable-relational-contract.md`
- `docs/architecture/adr/ADR-063-setup-refinement-request-prisma-schema-layout.md`
- `docs/project/setup-refinement-request-relational-adapter-model.md`
- `docs/architecture/adr/ADR-064-setup-refinement-request-relational-adapter-contract.md`
- `docs/project/setup-refinement-request-relational-rollout-model.md`
- `docs/architecture/adr/ADR-065-setup-refinement-request-adapter-backed-relational-repositories.md`

## Durable record shape
`SetupRefinementRequestDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema version fields
- required `setupDefinitionId`
- required `sourceResearchDecisionApprovalId`
- required `sourceResearchFeedbackDecisionId`
- `refinementStatus`
- `refinementRationaleSummary`
- `requestedChangesSummary`
- normalized `evidenceReferences`
- `requestedBy`
- `requestedAtUtc`
- nullable `assignedReviewerId`
- nullable `assignedOwnerId`

Optional domain fields are normalized to nullable durable scalar fields or an explicit durable array instead of omitted storage keys.

## Reference and mapping rules
- `setupDefinitionId` is required and identifies the durable setup family being refined
- `sourceResearchDecisionApprovalId` is required and identifies the approved manual decision that authorized the refinement follow-up
- `sourceResearchFeedbackDecisionId` is required and preserves the upstream feedback lineage behind that approval
- all three references are enforced as physical FKs because those upstream entities already exist as durable relational product entities
- `refinementStatus` remains explicit even though the current repository is create-only, because later workflow-state updates should not require reshaping the durable record contract
- optional evidence references are normalized to an explicit durable string array; absence becomes an empty stored array rather than a missing column
- `requestedAt` maps directly to `requestedAtUtc`, `createdAtUtc`, and `updatedAtUtc` for the current create-only write path
- `ProductRecordMetadata` remains attached to the durable product record and is not replaced by orchestration evidence artifacts

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- create starts at `identity.version = 1`
- the current `setup_refinement_request` repository is create-only, so this step defines immutable create semantics rather than a status-update lifecycle
- persistence does not infer approval legality, approval outcome semantics, approval/setup/feedback cross-link consistency, or later assignment workflow rules; the research service remains the source of those business rules
- if later refinement-request status updates are introduced, they should use the same optimistic version boundary as the other durable product entities

## Physical schema rules
The migration now enforces:
- positive version
- non-empty `setup_definition_id`
- non-empty `source_research_decision_approval_id`
- non-empty `source_research_feedback_decision_id`
- non-empty `refinement_rationale_summary`
- non-empty `requested_changes_summary`
- non-empty `requested_by`
- non-empty `assigned_reviewer_id` and `assigned_owner_id` when present
- request timestamp consistency with created/updated timestamps
- `updated_at_utc >= created_at_utc`
- archived timestamp consistency with lifecycle status

## Reference policy
Physical FKs are enforced for:
- `setup_definition_id`
- `source_research_decision_approval_id`
- `source_research_feedback_decision_id`

Still service-owned rather than encoded as compound relational constraints in this step:
- verifying that approval -> feedback lineage remains consistent
- verifying that approval -> setup lineage remains consistent
- verifying that the referenced approval outcome authorizes refinement
- verifying that `authorizedNextAction = refine_definition`

## Physical layout summary
Database schema:
- `product_domain`

Tables:
- `setup_refinement_request`

Enum families:
- `setup_refinement_status`
- reused `persisted_lifecycle_status`
- reused `product_record_source`

## What remains pending
- shared implemented-product bundle extension through `setup_refinement_request`
- opt-in real-Postgres integration coverage through `setup_refinement_request`
- later downstream execution/mutation durable slices after `setup_refinement_request`
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
