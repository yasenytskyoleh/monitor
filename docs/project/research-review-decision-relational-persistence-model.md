# Research Review Decision Relational Persistence Model

## Purpose
Define the durable relational contract and physical schema for `ResearchReviewDecision` before adapter implementation.

This keeps the next downstream review persistence slice narrow:
- logical durable record contract
- review-packet linkage and nullability rules
- versioning semantics
- deterministic repository failure expectations
- Prisma schema
- SQL migration

without yet introducing:
- repository adapters
- concrete relational repositories

## Implemented artifact locations
- `packages/domain-model/src/storage/research-review-decision-relational-slice.ts`
- `packages/domain-model/src/storage/research-review-decision-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260630113000_product_domain_research_review_decision_relational_v1/migration.sql`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/prisma-physical-schema-contracts.test.ts`
- `docs/architecture/adr/ADR-044-research-review-decision-durable-relational-contract.md`
- `docs/architecture/adr/ADR-045-research-review-decision-prisma-schema-layout.md`

## Durable record shape
`ResearchReviewDecisionDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema version fields
- `decisionStatus`
- `researchReviewPacketId`
- `setupFamilyId`
- nullable `setupRevisionId`
- nullable `researchHypothesisId`
- `reviewedBy`
- `reviewedAtUtc`
- `decisionOutcome`
- nullable `reviewerNotes`
- nullable `authorizedNextAction`

Optional domain fields are normalized to nullable durable fields rather than omitted storage keys.

## Reference and mapping rules
- `researchReviewPacketId` is required and must refer to the explicit review packet resolved by the review-decision service flow
- `researchReviewPacketId` remains a lookup-owned reference in this step, not a first-class relational FK target, because review packets are still assembled query artifacts rather than durable product entities
- `setupFamilyId` is required and must match the setup family validated against the referenced review packet
- `setupRevisionId` is nullable; when present it must match the review packet revision context already enforced by service validation
- `researchHypothesisId` is nullable; when present it must match the review packet hypothesis scope already enforced by service validation
- `reviewedBy` and `reviewedAtUtc` remain explicit durable fields because the decision artifact is reviewer-authored rather than runtime-derived
- `authorizedNextAction` is nullable and should be present only when the recorded outcome permits a downstream follow-up intent
- `createdAt` and `updatedAt` map directly to durable timestamps
- `ProductRecordMetadata` remains attached to the durable product record and is not replaced by orchestration evidence artifacts

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- create starts at `identity.version = 1`
- the current review-decision repository is create-only, so this step defines immutable create semantics rather than an update lifecycle
- if a later controlled audit-correction path is introduced, it must use the same optimistic version boundary as the other durable product entities

## Deterministic repository failure expectations
- duplicate create -> `already exists`
- invalid or missing `research_review_packet` reference -> rejected before persistence
- packet / setup-family / setup-revision / hypothesis mismatch -> rejected before persistence
- missing reads remain `null` / empty-list semantics at the repository boundary

## Physical schema rules
The migration now enforces:
- positive version
- non-empty `research_review_packet_id`
- non-empty `setup_family_id`
- non-empty `reviewed_by`
- non-empty `reviewer_notes` when present
- non-empty `setup_revision_id` and `research_hypothesis_id` when present
- current authorized-next-action semantics:
  - `accepted` outcomes require `authorized_next_action`
  - `rejected` outcomes require `authorized_next_action IS NULL`
  - `revise` outcomes require `authorized_next_action = prepare_refinement_follow_up`
- review timestamp consistency with created/updated timestamps
- `updated_at_utc >= created_at_utc`
- archived timestamp consistency with lifecycle status

## Reference policy
Physical FKs are enforced for:
- optional `research_hypothesis_id`

Still service-owned rather than encoded as relational FKs in this step:
- `research_review_packet_id`
- `setup_family_id`
- `setup_revision_id`

## Physical layout summary
Database schema:
- `product_domain`

Tables:
- `research_review_decision`

Enum families:
- `research_review_authorized_next_action`
- `research_review_decision_status`
- `research_review_decision_outcome`
- reused `persisted_lifecycle_status`
- reused `product_record_source`

## What remains pending
- repository adapter contract and repository rollout are completed in:
  - `docs/project/research-review-decision-relational-adapter-model.md`
  - `docs/project/research-review-decision-relational-rollout-model.md`
  - `docs/architecture/adr/ADR-046-research-review-decision-relational-adapter-contract.md`
  - `docs/architecture/adr/ADR-047-research-review-decision-adapter-backed-relational-repositories.md`
- shared implemented-product bundle extension through `research_review_decision`
- opt-in real-Postgres integration coverage through `research_review_decision`
- later review/execution durable slices
