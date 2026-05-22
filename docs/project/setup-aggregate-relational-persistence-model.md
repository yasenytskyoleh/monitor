# Setup Aggregate Relational Persistence Model

## Purpose
Define the durable relational contract and physical schema for `SetupAggregateResult` before implementing its adapter-backed repository layer.

This keeps the next persistence slice narrow:
- contract shape
- deterministic scope-key strategy
- Prisma schema
- SQL migration

without yet introducing repository mappers, in-memory durable adapters, or Prisma repository adapters for aggregate writes.

## Implemented artifact locations
- `packages/domain-model/src/storage/setup-aggregate-relational-slice.ts`
- `packages/domain-model/src/storage/setup-aggregate-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260522153000_product_domain_setup_aggregate_relational_v1/migration.sql`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/prisma-physical-schema-contracts.test.ts`

## Durable record shape
The durable record keeps:
- aggregate lifecycle and status
- `setupDefinitionId`
- optional `researchHypothesisId`
- full `aggregationScope`
- deterministic `scopeKey`
- all persisted aggregate counts and averages
- optional `computedAtUtc`
- optional `notes`
- standard product record metadata and versioning

## Scope storage strategy
`aggregationScope` is stored relationally as:
- `scope_key`
- `scope_evaluation_window_id`
- `scope_symbol_scope_kind`
- `scope_symbol_ids`
- `scope_time_range_start_at_utc`
- `scope_time_range_end_at_utc`
- optional `scope_research_run_id`
- optional `scope_hypothesis_id`

Why this shape:
- it preserves the explicit scope semantics already used by the domain model
- it avoids introducing JSON-only storage for a structure the repo already treats as typed, first-class evidence scope
- it allows one deterministic uniqueness boundary per setup + scope via `(setup_definition_id, scope_key)`

## Physical schema rules
The migration now enforces:
- positive version
- non-empty `scope_key`
- non-negative aggregate counts
- `completed_evaluations <= total_candidates`
- `invalidated_evaluations <= total_candidates`
- `positive_outcome_count <= completed_evaluations`
- scope time-range ordering
- pending-state metric consistency
- completed-state metric completeness
- created/updated/computed timestamp ordering
- archived timestamp consistency

## Reference policy
Physical FKs are enforced for:
- `setup_definition_id`
- optional `research_hypothesis_id`

Scalar-only scope references remain scalar in this step:
- `scope_research_run_id`
- `scope_hypothesis_id`

This keeps the slice aligned with existing durable coverage instead of inventing more relational tables prematurely.

## What remains pending
- adapter-backed `SetupAggregateResult` relational repository
- concrete Prisma adapter for aggregate persistence
- shared integration coverage across setup -> candidate -> evaluation -> aggregate repository flow
