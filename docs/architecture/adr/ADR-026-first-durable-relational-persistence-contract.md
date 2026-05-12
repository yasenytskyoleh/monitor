# ADR-026: First Durable Relational Persistence Contract

## Status
Accepted — 2026-05-12

## Context
After in-memory persistence and service-owned write paths were implemented, the repo still lacked an explicit durable relational persistence contract for the first durable slice.

Without that contract, future relational adapter and migration work risks:
- diverging from current repository semantics,
- changing optimistic concurrency behavior silently,
- and mixing logical persistence shape with physical table layout decisions too early.

## Decision
Adopt a first durable relational persistence contract for:
- `setup_definition`
- `research_hypothesis`
- explicit `research_hypothesis <-> setup_definition` linkage

Contract rules:
- use logical durable record contracts in `packages/domain-model/src/storage/first-durable-relational-slice.ts`
- fix `storageSchemaVersion` to `product_domain.relational.v1`
- use `identity.version` as the optimistic concurrency version mapped from repository `expectedVersion`
- keep repositories returning domain-shaped records
- allow physical relational normalization, including join tables for linkage, as long as the logical durable contract is preserved

## Consequences

### Positive
- relational adapter work now has an explicit contract target
- optimistic concurrency semantics remain aligned with in-memory repository behavior
- physical table design can stay flexible without losing the logical storage contract

### Tradeoffs
- this adds one more contract layer before migrations
- physical schema details remain intentionally incomplete until adapter design is explicit

## Explicitly postponed
- Prisma schema
- DB migrations
- concrete relational repository adapters
- query/index tuning
- durable relational planning for entities beyond `setup_definition` and `research_hypothesis`

## Guardrails
- no DB runtime implementation in this ADR
- no migration SQL in this ADR
- no change to domain-facing repository/service APIs in this ADR
- no direct orchestrator-to-product storage coupling

## Follow-up
- define relational adapter rollout design and deterministic error mapping before migration work begins
