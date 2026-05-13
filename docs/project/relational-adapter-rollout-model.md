# Relational Adapter Rollout Model

## Purpose
Define the first repository-adapter rollout contract for durable relational persistence.

This step formalizes:
- repository-to-adapter boundaries,
- hydration/dehydration responsibilities,
- deterministic persistence-error mapping,
- and transaction boundaries

for the first durable slice with committed physical schema artifacts but without physical DB runtime code.

## First adapter rollout scope
- `SetupDefinition`
- `ResearchHypothesis`
- explicit `ResearchHypothesis <-> SetupDefinition` linkage

## Contract sources
- `packages/domain-model/src/repositories/first-durable-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/repository-error.ts`
- `packages/domain-model/src/storage/first-durable-relational-slice.ts`
- `packages/domain-model/prisma/schema.prisma`

## Boundary model
Direction:
- service -> repository -> relational adapter -> physical relational storage

Rules:
1. services continue to own product write semantics
2. repositories continue to expose domain-shaped records
3. adapters operate on durable record contracts and physical persistence concerns
4. physical table layout may vary, but durable-record and error contracts must remain stable

## Adapter operation contract

### SetupDefinition adapter operations
- `loadSetupDefinitionRecord`
- `listSetupDefinitionRecordsByStatus`
- `insertSetupDefinitionRecord`
- `updateSetupDefinitionRecord`

Repository mapping:
- repository `create` -> adapter `insert`
- repository `update` -> adapter `update`
- repository `updateStatus` -> repository mutates domain shape, dehydrates durable record, then adapter `update`

### ResearchHypothesis adapter operations
- `loadResearchHypothesisBundle`
- `listResearchHypothesisBundlesByStatus`
- `insertResearchHypothesisBundle`
- `updateResearchHypothesisBundle`

Repository mapping:
- repository `create` -> adapter `insert`
- repository `update` -> adapter `update`
- repository `updateStatus` -> repository mutates domain shape, then adapter `update`
- setup-link replacement happens inside the bundle update path, not as a separate public repository operation

## Hydration and dehydration rules

### SetupDefinition
- one durable record maps directly to one domain `SetupDefinition`
- `identity.version` maps to repository optimistic concurrency version
- `traceMetadata` remains product trace data, not orchestration evidence

### ResearchHypothesis
- one durable hypothesis record plus zero-or-more link records hydrate into one domain `ResearchHypothesis`
- `relatedSetupDefinitionIds` must be unique
- output ordering of `relatedSetupDefinitionIds` is not semantically significant
- repository update must replace the full durable link set atomically with the hypothesis row update

## Deterministic persistence-error mapping
Deterministic adapter error codes for the first durable slice:
- `already_exists`
- `not_found`
- `version_mismatch`
- `invalid_reference`

Retryable adapter error codes:
- `transient_failure`
- `unknown_failure`

Expected physical-to-contract mapping:
- unique/primary key conflict on create -> `already_exists`
- update target missing -> `not_found`
- optimistic update affects zero rows after version check -> `version_mismatch`
- missing linked `setup_definition` during hypothesis write -> `invalid_reference`
- connection interruption, lock timeout, deadlock, serialization retry class -> `transient_failure`
- uncategorized persistence failure -> `unknown_failure`

## Transaction boundaries
- `SetupDefinition` writes are single-record atomic writes
- `ResearchHypothesis` row writes and hypothesis-link writes must commit atomically
- partial link replacement is forbidden
- durable write failure must leave previous committed bundle intact

## Rollout order
1. physical Prisma schema is defined for `setup_definition`, `research_hypothesis`, and hypothesis-link storage
2. initial SQL migration for `product_domain.relational.v1` is committed
3. implement relational adapters that satisfy the adapter and error contracts
4. run parity tests against current in-memory repository semantics

## Explicitly postponed
- Prisma client/runtime wiring
- repository wiring to real DB runtime
- expansion of adapter rollout beyond the first durable slice
- runtime ingestion/detection/evaluation/aggregation work
- UI
