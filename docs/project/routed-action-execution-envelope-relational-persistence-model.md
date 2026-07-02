# Routed Action Execution Envelope Relational Persistence Model

## Purpose
Define the durable relational contract and physical schema for `RoutedActionExecutionEnvelope` before adapter implementation.

This keeps the first downstream review/execution persistence slice narrow:
- logical durable record contract
- review/routing lineage rules
- snapshot-field storage rules
- versioning semantics
- deterministic repository failure expectations
- Prisma schema
- SQL migration

without yet introducing:
- repository adapters
- concrete relational repositories
- concrete Prisma adapters

## Implemented artifact locations
- `packages/domain-model/src/storage/routed-action-execution-envelope-relational-slice.ts`
- `packages/domain-model/src/storage/routed-action-execution-envelope-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260702103000_product_domain_routed_action_execution_envelope_relational_v1/migration.sql`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/prisma-physical-schema-contracts.test.ts`
- `packages/domain-model/src/execution/downstream-action-execution-preparation-service.ts`
- `packages/domain-model/test/routed-action-execution-envelope.test.ts`
- `docs/architecture/adr/ADR-050-routed-action-execution-envelope-durable-relational-contract.md`
- `docs/architecture/adr/ADR-051-routed-action-execution-envelope-prisma-schema-layout.md`

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
- `sourceReviewDecisionId` is now enforced as a real physical FK because `research_review_decision` is already a durable relational product entity
- `actionTarget` and `actionCommandType` must stay aligned with the stored `executionPayloadSnapshot`
- `targetEntityRefs` stays structured because the envelope is an explicit command-wrapper snapshot, not only a flattened foreign-key list
- `routeMetadataSnapshot` preserves the route decision context that existed when the envelope was prepared
- nullable domain `originRunId` maps to `envelope_origin_run_id` so it stays distinct from standard product-record metadata `origin_run_id`
- `preparedBy` and `preparedAtUtc` remain explicit durable fields because execution preparation is an auditable write path, not an implicit runtime side effect
- `createdAt` and `updatedAt` map directly to durable timestamps
- `ProductRecordMetadata` remains attached to the durable product record and is not replaced by orchestration evidence artifacts

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- create starts at `identity.version = 1`
- the current routed-action-execution-envelope repository is create-only, so this step defines immutable create semantics rather than an update lifecycle
- the preparation service now clamps `updatedAt` so it never falls before `preparedAt`, matching the standard durable timestamp invariant already enforced across the other slices
- if later execution-status transitions are persisted, they must use the same optimistic version boundary as the other durable product entities

## Deterministic repository failure expectations
- duplicate create -> `already exists`
- missing or non-executable routing result -> rejected before persistence by the preparation service flow
- missing required target references for the selected downstream command -> rejected before persistence
- missing reads remain `null` / empty-list semantics at the repository boundary

## Physical schema rules
The migration now enforces:
- positive version
- non-empty `source_routing_result_id`
- non-empty `source_review_decision_id`
- non-empty `prepared_by`
- non-empty `notes` when present
- non-empty `envelope_origin_run_id` when present
- JSON-object shape for:
  - `target_entity_refs`
  - `route_metadata_snapshot`
  - `execution_payload_snapshot`
- required executable target context inside `target_entity_refs`
- current executable envelope semantics:
  - no-op routes are not persisted in this table
  - `action_target` and `action_command_type` must stay aligned
  - `execution_payload_snapshot.commandType` and `.target` must match the persisted executable target and command type
- prepared timestamp consistency with created/updated timestamps
- `updated_at_utc >= created_at_utc`
- archived timestamp consistency with lifecycle status

## Reference policy
Physical FKs are enforced for:
- `source_review_decision_id`

Still service-owned rather than encoded as relational FKs in this step:
- `source_routing_result_id`
- target refs inside `target_entity_refs`

## Physical layout summary
Database schema:
- `product_domain`

Tables:
- `routed_action_execution_envelope`

Enum families:
- `downstream_action_target`
- `review_decision_downstream_command_type`
- `routed_action_execution_status`
- reused `persisted_lifecycle_status`
- reused `product_record_source`

## What remains pending
- repository adapter contract and relational repository rollout for `routed_action_execution_envelope`
- later shared-bundle and integration extension for downstream execution/mutation entities
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
