# ADR-031: Setup Aggregate Durable Relational Contract And Schema

## Status
Accepted

## Context
The repo already had durable relational coverage for:
- `setup_definition`
- `research_hypothesis`
- `signal_candidate`
- `evaluation_result`

`setup_aggregate_result` was still the remaining implemented, service-owned product entity without durable relational planning artifacts.

Because aggregation results sit at the end of the current setup -> candidate -> evaluation -> aggregate domain chain, they are the next logical persistence boundary before any runtime-engine expansion.

## Decision
Implement the durable relational contract and physical schema for `setup_aggregate_result` now, but stop before repository and adapter implementation.

This includes:
- a typed durable record contract
- deterministic scope-key strategy
- Prisma schema changes
- committed SQL migration
- contract/schema tests

This step explicitly does not include repository mappers or concrete Prisma repository adapters.

## Consequences
Positive:
- all currently implemented product entities now have at least durable relational contract/schema coverage
- the next aggregate-persistence step is narrowed to repository/adapter implementation instead of mixed design + implementation work
- aggregate scope semantics are now explicit in relational storage terms

Tradeoffs:
- aggregate repository/runtime parity is still incomplete until the adapter-backed repository layer is added
- `scope_research_run_id` and `scope_hypothesis_id` remain scalar descriptors rather than fully related entities

## Explicitly not included
- `SetupAggregateResult` relational repository implementation
- concrete Prisma adapter for aggregate writes
- new runtime aggregation jobs
- analytics/scoring expansion
- UI work

## Follow-up
- implement the adapter-backed `SetupAggregateResult` repository and Prisma adapter using the committed contract/schema
