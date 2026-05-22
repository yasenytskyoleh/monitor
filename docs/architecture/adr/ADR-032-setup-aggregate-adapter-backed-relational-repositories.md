# ADR-032: Setup Aggregate Adapter-Backed Relational Repositories

## Status
Accepted

## Context
The repo already had durable relational parity for:
- `setup_definition`
- `research_hypothesis`
- `signal_candidate`
- `evaluation_result`

`setup_aggregate_result` already had:
- a typed durable contract
- committed Prisma schema changes
- a committed SQL migration

What was still missing was the executable repository layer:
- adapter contract
- in-memory validation harness
- relational repository implementation
- concrete Prisma adapter
- slice-level integration coverage

Without that layer, the current implemented product entities still did not all have the same persistence boundary quality.

## Decision
Implement the aggregate repository/runtime parity step for `setup_aggregate_result` now.

This includes:
- durable adapter contract
- in-memory adapter harness
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared repository composition
- opt-in real-Postgres integration coverage

## Consequences
Positive:
- all five implemented, service-owned product entities now have durable relational parity
- aggregate scope and reference semantics are now enforced consistently across in-memory and Prisma-backed persistence paths
- the next persistence task moves from per-entity parity to broader cross-slice repository composition

Tradeoffs:
- repository composition is still slice-oriented rather than one combined all-entities bundle
- end-to-end real-Postgres integration across setup -> candidate -> evaluation -> aggregate still needs one broader shared flow

## Explicitly not included
- new runtime aggregation jobs
- new analytics/scoring behaviors
- exchange ingestion
- UI work
- review/execution durable slices outside the currently implemented five entities

## Follow-up
- compose a broader shared Prisma-backed repository bundle across the implemented durable entities
- add end-to-end real-database integration coverage across setup -> candidate -> evaluation -> aggregate flows
