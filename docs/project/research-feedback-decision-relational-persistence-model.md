# Research Feedback Decision Relational Persistence Model

## Purpose
Define the durable relational contract and physical schema for `ResearchFeedbackDecision` before adapter implementation.

This keeps the next downstream persistence slice narrow:
- logical durable record contract
- reference and nullability rules
- versioning semantics
- deterministic repository failure expectations
- Prisma schema
- SQL migration

without yet introducing:
- repository mappers
- in-memory durable adapters
- concrete Prisma adapters

## Implemented artifact locations
- `packages/domain-model/src/storage/research-feedback-decision-relational-slice.ts`
- `packages/domain-model/src/storage/research-feedback-decision-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260523091500_product_domain_research_feedback_decision_relational_v1/migration.sql`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/prisma-physical-schema-contracts.test.ts`
- `docs/architecture/adr/ADR-034-research-feedback-decision-durable-relational-contract.md`
- `docs/architecture/adr/ADR-035-research-feedback-decision-prisma-schema-layout.md`

## Durable record shape
`ResearchFeedbackDecisionDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema version fields
- `decisionStatus`
- `setupDefinitionId`
- `researchHypothesisId`
- nullable `setupAggregateResultId`
- `evidenceStatus`
- `recommendedAction`
- `rationaleSummary`
- `requiresManualReview`
- nullable `evidenceSummary`
- nullable `reviewerMetadata`

Optional domain fields are normalized to nullable durable fields rather than omitted storage keys.

## Reference and mapping rules
- `setupDefinitionId` is required and must keep matching the setup reviewed by the existing research service flow
- `researchHypothesisId` is required and must remain compatible with the setup linkage already enforced by service validation
- `setupAggregateResultId` is nullable; when present it must refer to an aggregate result that belongs to the same setup and, if linked, the same hypothesis
- `reviewerMetadata` remains a logical JSON object in this contract; physical schema may normalize selected reviewer fields later as long as the domain shape is preserved
- `reviewerMetadata` is stored as `JSONB` in the current physical layout to preserve the existing domain shape without inventing a separate reviewer-detail table
- `createdAt` and `updatedAt` map directly to durable timestamps
- `ProductRecordMetadata` remains attached to the durable product record and is not replaced by orchestration evidence artifacts

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- create starts at `identity.version = 1`
- each successful status/reviewer update increments `identity.version` by `1`
- repository `expectedVersion` continues to map to stored `identity.version`
- persistence does not infer lifecycle transitions; service logic remains the source of decision-status rules

## Deterministic repository failure expectations
- duplicate create -> `already exists`
- missing entity on status update -> `not found`
- stale `expectedVersion` -> `version mismatch`
- invalid setup / hypothesis / aggregate linkage -> rejected before persistence

## Physical schema rules
The migration now enforces:
- positive version
- non-empty `rationale_summary`
- non-empty `evidence_summary` when present
- current manual-review semantics via `requires_manual_review = true`
- `reviewer_metadata IS NULL` while `decision_status = proposed`
- `reviewer_metadata IS NOT NULL` once `decision_status` leaves `proposed`
- `updated_at_utc >= created_at_utc`
- archived timestamp consistency with lifecycle status

## Reference policy
Physical FKs are enforced for:
- `setup_definition_id`
- `research_hypothesis_id`
- optional `setup_aggregate_result_id`

Still service-owned rather than compound-FK enforced in this step:
- verifying that an optional `setup_aggregate_result_id` belongs to the same setup
- verifying that an optional aggregate result, when hypothesis-linked, matches the same hypothesis

## Physical layout summary
Database schema:
- `product_domain`

Tables:
- `research_feedback_decision`

Enum families:
- `research_feedback_decision_action`
- `research_feedback_decision_status`
- reused `hypothesis_evidence_status`
- reused `persisted_lifecycle_status`
- reused `product_record_source`

## What remains pending
- repository adapter contract and deterministic error mapping for `research_feedback_decision`
- domain/durable mappers, adapter-backed repository, and concrete Prisma adapter wiring
- later approval/review/execution durable slices
