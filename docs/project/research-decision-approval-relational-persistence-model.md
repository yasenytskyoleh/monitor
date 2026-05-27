# Research Decision Approval Relational Persistence Model

## Purpose
Define the durable relational contract and physical schema for `ResearchDecisionApproval` before adapter implementation.

This keeps the next downstream approval persistence slice narrow:
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
- `packages/domain-model/src/storage/research-decision-approval-relational-slice.ts`
- `packages/domain-model/src/storage/research-decision-approval-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260527103000_product_domain_research_decision_approval_relational_v1/migration.sql`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/prisma-physical-schema-contracts.test.ts`
- `docs/architecture/adr/ADR-038-research-decision-approval-durable-relational-contract.md`
- `docs/architecture/adr/ADR-039-research-decision-approval-prisma-schema-layout.md`

## Durable record shape
`ResearchDecisionApprovalDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema version fields
- `approvalStatus`
- `researchFeedbackDecisionId`
- `setupDefinitionId`
- `reviewedBy`
- `reviewedAtUtc`
- `approvalOutcome`
- nullable `reviewerNotes`
- nullable `authorizedNextAction`

Optional domain fields are normalized to nullable durable fields rather than omitted storage keys.

## Reference and mapping rules
- `researchFeedbackDecisionId` is required and must refer to the feedback decision approved by the current research review flow
- `setupDefinitionId` is required and must remain consistent with the setup attached to the referenced feedback decision
- `reviewedBy` and `reviewedAtUtc` remain explicit durable fields because the approval artifact is reviewer-authored rather than runtime-derived
- `reviewerNotes` is nullable and keeps the existing domain meaning without forcing a separate notes table
- `authorizedNextAction` is nullable and should be present only for outcomes that authorize a downstream action
- `createdAt` and `updatedAt` map directly to durable timestamps
- `ProductRecordMetadata` remains attached to the durable product record and is not replaced by orchestration evidence artifacts

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- create starts at `identity.version = 1`
- the current approval repository is create-only, so this step defines immutable create semantics rather than an update lifecycle
- if a later controlled update path is introduced, it must use the same optimistic version boundary as the other durable product entities

## Deterministic repository failure expectations
- duplicate create -> `already exists`
- invalid `research_feedback_decision` reference -> rejected before persistence
- invalid `setup_definition` reference -> rejected before persistence
- mismatched feedback-decision / setup linkage -> rejected before persistence
- missing reads remain `null` / empty-list semantics at the repository boundary

## Physical schema rules
The migration now enforces:
- positive version
- non-empty `reviewed_by`
- non-empty `reviewer_notes` when present
- current authorization semantics:
  - `approved` outcomes require `authorized_next_action`
  - non-`approved` outcomes require `authorized_next_action IS NULL`
- review timestamp consistency with created/updated timestamps
- `updated_at_utc >= created_at_utc`
- archived timestamp consistency with lifecycle status

## Reference policy
Physical FKs are enforced for:
- `research_feedback_decision_id`
- `setup_definition_id`

Still service-owned rather than compound-FK enforced in this step:
- verifying that the referenced feedback decision belongs to the same setup definition

## Physical layout summary
Database schema:
- `product_domain`

Tables:
- `research_decision_approval`

Enum families:
- `research_decision_approval_status`
- `research_decision_approval_outcome`
- reused `research_feedback_decision_action`
- reused `persisted_lifecycle_status`
- reused `product_record_source`

## What remains pending
- repository adapter contract and deterministic error mapping for `research_decision_approval`
- domain/durable mappers, adapter-backed repository, and concrete Prisma adapter wiring
- later review/execution durable slices
