# Research Feedback Decision Relational Persistence Model

## Purpose
Define the durable relational contract for `ResearchFeedbackDecision` before physical schema or adapter implementation.

This step keeps the next downstream persistence slice narrow:
- logical durable record contract
- reference and nullability rules
- versioning semantics
- deterministic repository failure expectations

without yet introducing:
- Prisma schema or SQL migration artifacts
- repository mappers
- in-memory durable adapters
- concrete Prisma adapters

## Implemented artifact locations
- `packages/domain-model/src/storage/research-feedback-decision-relational-slice.ts`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `docs/architecture/adr/ADR-034-research-feedback-decision-durable-relational-contract.md`

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

## What remains pending
- Prisma physical schema and migration layout for `research_feedback_decision`
- repository mappers and adapter contracts
- concrete relational repository and Prisma adapter wiring
- later approval/review/execution durable slices
