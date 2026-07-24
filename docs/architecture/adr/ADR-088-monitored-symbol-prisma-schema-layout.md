# ADR-088: Monitored Symbol Prisma Schema Layout

## Status
Accepted

## Context
`monitored_symbol` has a durable relational contract but no committed physical representation. The catalog record must preserve its status, market scope, provider hint, tags, source bindings, and standard product metadata before relational adapters can use it.

## Decision
Add a Prisma model and SQL migration for `monitored_symbol`.

The layout uses dedicated catalog enums, a text array for tags, a JSON array for source bindings, indexes for status and market-scope/status queries, and checks for catalog identity, temporal ordering, source-binding shape, and archived status/lifecycle consistency.

Signal candidates remain unchanged: this migration creates the catalog table without retrofitting their existing scalar `monitored_symbol_id` references into foreign keys.

## Consequences
Positive:
- monitored symbols now have a committed physical storage boundary
- catalog query paths are indexed without changing existing candidate behavior
- later adapters can map the full catalog value shape without schema inference

Tradeoffs:
- source bindings remain JSON until a separate normalization need is proven
- no relational adapter or repository implementation is included

## Explicitly not included
- signal-candidate foreign-key changes
- monitored-symbol adapter, mapper, or repository implementation
- runtime ingestion, exchange connectors, or UI work

## Follow-up
- define the monitored-symbol relational adapter contract
