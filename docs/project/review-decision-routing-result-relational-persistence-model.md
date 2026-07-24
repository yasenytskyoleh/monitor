# Review Decision Routing Result Relational Persistence Model

## Purpose
Define the durable relational contract for `ReviewDecisionRoutingResult`, selected as the next downstream execution-handoff persistence slice after `setup_revision_activation_record`.

This step includes the logical durable record contract, persisted-entity registration, committed Prisma schema, SQL migration, adapter contract, mappers, relational repository, and Prisma adapter. Shared composition and integration remain later rollout stages.

## Implemented artifact locations
- `packages/domain-model/src/review/review-decision-routing-result.ts`
- `packages/domain-model/src/repositories/review-decision-routing-result-repository.ts`
- `packages/domain-model/src/repositories/review-decision-routing-result-repository.impl.ts`
- `packages/domain-model/src/storage/review-decision-routing-result-relational-slice.ts`
- `packages/domain-model/src/storage/review-decision-routing-result-relational-physical-schema.ts`
- `packages/domain-model/src/repositories/review-decision-routing-result-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/review-decision-routing-result-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/review-decision-routing-result-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/review-decision-routing-result-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/review-decision-routing-result-relational-prisma-adapter.ts`
- `packages/domain-model/src/storage/storage-boundary.ts`
- `packages/domain-model/src/storage/persisted-entity.ts`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/prisma-physical-schema-contracts.test.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260723103000_product_domain_review_decision_routing_result_relational_v1/migration.sql`
- `docs/architecture/adr/ADR-080-review-decision-routing-result-durable-relational-contract.md`
- `docs/architecture/adr/ADR-081-review-decision-routing-result-prisma-schema-layout.md`
- `docs/architecture/adr/ADR-082-review-decision-routing-result-relational-adapter-contract.md`
- `docs/architecture/adr/ADR-083-review-decision-routing-result-adapter-backed-relational-repositories.md`

## Durable record shape
`ReviewDecisionRoutingResultDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema-version fields
- required routable terminal status (`routed` or `no_action`), research-review-decision id, setup-family id, decision outcome, downstream command type, and routing timestamp
- nullable setup-revision id, authorized-next-action, downstream target, and no-action reason
- explicit warning messages to preserve routing diagnostics

`identity.entityId` is the routing id. The source review-decision and setup-family references are also stored explicitly so later execution-envelope preparation can retrieve routing context without reconstructing it from mutable review state.

## Reference and ownership rules
- `researchReviewDecisionId` references the resolved review decision that was routed
- `setupFamilyId` is explicit because downstream actions are scoped to a setup family
- `setupRevisionId` remains nullable because not every route targets a revision
- `target`, `authorizedNextAction`, and `reason` remain nullable to faithfully represent no-action routing outcomes
- rejected routing outcomes remain transient because the routing service does not assign them a stable routing id or complete route context

## Physical schema rules
- `routing_status` is a dedicated enum restricted to `routed` and `no_action`
- `research_review_decision_id` has a physical foreign key to `research_review_decision`
- `setup_family_id` is stored directly for family/timestamp routing-history queries
- `setup_revision_id`, authorized next action, downstream target, and reason remain nullable
- `warnings` is a required JSON array, preserving the routing record's warning list without adding a separate child table
- the migration enforces positive versions, non-empty required and optional identifiers, routing timestamp consistency, update ordering, and lifecycle/archive timestamp consistency

Routing-policy rules remain service-owned, including review-decision outcome/action compatibility, route target/command compatibility, and setup-family/revision lineage.

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- repository optimistic version starts at `identity.version = 1`
- the current in-memory repository exposes create-only behavior, so this contract defines immutable result creation; only controlled audit metadata corrections are a future update concern

## What remains pending
- shared implemented-product composition and opt-in real-Postgres integration extension
- service-owned routing-result write path
- shared implemented-product bundle and opt-in real-Postgres integration extension
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
