# Relational Repository Implementation Model

## Purpose
Define the first executable relational repository layer for the first durable slice.

This step adds adapter-backed repositories and hydration/dehydration logic for:
- `SetupDefinition`
- `ResearchHypothesis`
- explicit `ResearchHypothesis <-> SetupDefinition` linkage

without yet wiring a concrete Prisma client or live DB runtime.

## Implemented artifact locations
- `packages/domain-model/src/repositories/first-durable-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/first-durable-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/setup-definition-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/research-hypothesis-relational-repository.impl.ts`
- `packages/domain-model/test/first-durable-relational-repository-mappers.test.ts`
- `packages/domain-model/test/relational-repositories.test.ts`

## Layer responsibilities
Direction:
- service -> repository -> adapter -> physical relational storage

Implemented now:
- repositories hydrate and dehydrate between domain contracts and durable record contracts
- adapter contract remains the single boundary for physical persistence behavior
- an in-memory adapter harness validates repository semantics without needing Prisma packages or a live database

Not implemented yet:
- concrete Prisma adapter methods
- Prisma client generation/runtime wiring
- database connection lifecycle and transaction integration

## Mapping behavior

### SetupDefinition
- repository create writes durable version `1`
- repository update/status-update writes durable `version + 1`
- `status=archived` maps to:
  - `lifecycleStatus=archived`
  - `archivedAtUtc=updatedAt`
- non-archived setup states map to `lifecycleStatus=active`

### ResearchHypothesis
- repository create writes durable version `1`
- repository update/status-update writes durable `version + 1`
- `relatedSetupDefinitionIds` are normalized and written as durable link rows
- durable link rows are the hydrated source of truth for setup linkage
- research hypothesis lifecycle remains `active` in this slice; closure is a domain status, not durable archival

## Validation harness role
`InMemoryFirstDurableRelationalRepositoryAdapter` exists to validate:
- duplicate-create handling
- version-mismatch handling
- missing-reference handling
- repository hydration/dehydration behavior

It is not durable product storage and does not replace the committed Prisma schema/migration artifacts.

## What remains pending
- Prisma client/tooling wiring
- concrete Prisma implementation of `FirstDurableRelationalRepositoryAdapter`
- live transaction handling against PostgreSQL
- parity checks between concrete Prisma adapter behavior and the in-memory adapter-backed repository baseline
