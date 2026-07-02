# Routed Action Execution Envelope Relational Persistence Model

## Purpose
Define the durable relational contract for `RoutedActionExecutionEnvelope` before physical schema implementation.

This keeps the first downstream review/execution persistence slice narrow:
- logical durable record contract
- review/routing lineage rules
- snapshot-field storage rules
- versioning semantics
- deterministic repository failure expectations

without yet introducing:
- Prisma schema
- SQL migration
- repository adapters
- concrete relational repositories

## Implemented artifact locations
- `packages/domain-model/src/storage/routed-action-execution-envelope-relational-slice.ts`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `docs/architecture/adr/ADR-050-routed-action-execution-envelope-durable-relational-contract.md`

## Durable record shape
`RoutedActionExecutionEnvelopeDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema version fields
- `executionStatus`
- required `sourceRoutingResultId`
- required `sourceReviewDecisionId`
- `actionTarget`
- `actionCommandType`
- structured `targetEntityRefs`
- structured `routeMetadataSnapshot`
- structured `executionPayloadSnapshot`
- `preparedBy`
- `preparedAtUtc`
- nullable `originRunId`
- nullable `notes`

Optional domain fields are normalized to nullable durable fields rather than omitted storage keys.

## Reference and mapping rules
- `sourceRoutingResultId` is required and identifies the routing artifact that produced the execution envelope
- `sourceRoutingResultId` remains a lookup-owned reference in this step, not a first-class relational FK target, because review-decision routing results are still persisted as query/runtime artifacts rather than durable relational product entities
- `sourceReviewDecisionId` is required and identifies the durable `research_review_decision` that authorized the route
- `actionTarget` and `actionCommandType` must stay aligned with the stored `executionPayloadSnapshot`
- `targetEntityRefs` stays structured because the envelope is an explicit command-wrapper snapshot, not only a flattened foreign-key list
- `routeMetadataSnapshot` preserves the route decision context that existed when the envelope was prepared
- `preparedBy` and `preparedAtUtc` remain explicit durable fields because execution preparation is an auditable write path, not an implicit runtime side effect
- `createdAt` and `updatedAt` map directly to durable timestamps
- `ProductRecordMetadata` remains attached to the durable product record and is not replaced by orchestration evidence artifacts

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- create starts at `identity.version = 1`
- the current routed-action-execution-envelope repository is create-only, so this step defines immutable create semantics rather than an update lifecycle
- if later execution-status transitions are persisted, they must use the same optimistic version boundary as the other durable product entities

## Deterministic repository failure expectations
- duplicate create -> `already exists`
- missing or non-executable routing result -> rejected before persistence by the preparation service flow
- missing required target references for the selected downstream command -> rejected before persistence
- missing reads remain `null` / empty-list semantics at the repository boundary

## What remains pending
- Prisma schema and SQL migration for `routed_action_execution_envelope`
- repository adapter contract and relational repository rollout for `routed_action_execution_envelope`
- later shared-bundle and integration extension for downstream execution/mutation entities
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
