# Setup Aggregate Relational Rollout Model

## Purpose
Capture the executable durable relational rollout for `SetupAggregateResult` on top of the already-committed contract and schema.

This step finishes the per-entity durable parity work for the current implemented product entities without expanding into runtime aggregation jobs, analytics orchestration, or UI.

## Implemented artifact locations
- `packages/domain-model/src/storage/setup-aggregate-relational-slice.ts`
- `packages/domain-model/src/storage/setup-aggregate-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260522153000_product_domain_setup_aggregate_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/setup-aggregate-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/setup-aggregate-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/setup-aggregate-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/setup-aggregate-result-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/setup-aggregate-relational-repositories.ts`
- `packages/domain-model/src/repositories/setup-aggregate-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/setup-aggregate-relational-prisma-client.ts`
- `packages/domain-model/test/setup-aggregate-relational-repository-mappers.test.ts`
- `packages/domain-model/test/setup-aggregate-relational-repository-adapter.test.ts`
- `packages/domain-model/test/setup-aggregate-relational-repositories.test.ts`
- `packages/domain-model/test/setup-aggregate-relational-prisma-adapter.test.ts`
- `packages/domain-model/test/setup-aggregate-relational-repositories.integration.test.ts`

## What this step adds
- a durable adapter contract for `setup_aggregate_result`
- a reference-validating in-memory durable adapter harness
- domain-to-durable hydration/dehydration mappers
- an adapter-backed relational repository implementation
- a concrete Prisma adapter with deterministic error mapping for:
  - `setup_definition`
  - `research_hypothesis`
- slice-level shared repository composition
- opt-in real-Postgres integration coverage for the aggregate slice

## What this step proves
- all five implemented, service-owned product entities now have:
  - implemented in-memory persistence
  - durable relational contracts
  - committed Prisma schema/migrations
  - adapter-backed repositories
  - concrete Prisma adapters
- aggregate scope-key uniqueness and aggregate reference validation survive the adapter boundary
- the remaining persistence work is now primarily cross-slice composition and end-to-end integration, not per-entity parity work

## What remains pending
- broader shared Prisma-backed repository composition across:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
- end-to-end real-database integration coverage across setup -> candidate -> evaluation -> aggregate flows
- runtime detection, evaluation, and aggregation engines
- exchange ingestion and UI work
