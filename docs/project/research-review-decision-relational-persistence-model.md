# Research Review Decision Relational Persistence Model

## Purpose
Define the durable relational contract for `ResearchReviewDecision` before physical schema implementation.

This keeps the next downstream review persistence slice narrow:
- logical durable record contract
- review-packet linkage and nullability rules
- versioning semantics
- deterministic repository failure expectations

without yet introducing:
- Prisma schema
- SQL migration
- repository adapters
- concrete relational repositories

## Implemented artifact locations
- `packages/domain-model/src/storage/research-review-decision-relational-slice.ts`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `docs/architecture/adr/ADR-044-research-review-decision-durable-relational-contract.md`

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

## What remains pending
- Prisma physical schema and SQL migration for `research_review_decision`
- repository adapter contract and deterministic relational error mapping
- domain/durable mappers, adapter-backed repository, and concrete Prisma adapter wiring
- later review/execution durable slices
