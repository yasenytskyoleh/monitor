# ADR-087: Monitored Symbol Durable Relational Contract

## Status
Accepted

## Context
`monitored_symbol` is a first-class product-persisted entity and the catalog reference used by signal candidates. It now has an implemented in-memory repository and a monitoring-catalog service write path, but lacks a durable relational record contract.

Without an explicit contract, a later schema would need to infer how the catalog identity, market scope, provider hint, tags, and source bindings should be retained.

## Decision
Add a logical durable relational contract for `monitored_symbol`.

The contract includes:
- standard product-domain identity, lifecycle, metadata, and optimistic-version fields
- the required catalog symbol id, base asset, quote asset, display name, market scope, status, and provider hint
- durable tag and source-binding collections using the existing domain shapes

`identity.entityId` and `symbolId` carry the same immutable catalog identity. The duplicated explicit field makes future relational mapping and catalog queries unambiguous without changing the existing repository API.

## Consequences
Positive:
- the remaining first-class product entity now has a defined durable boundary
- future signal-candidate foreign-key work can reference a stable catalog record
- the current in-memory catalog behavior becomes a clear source for mapper and repository rollout

Tradeoffs:
- this step does not add a Prisma model, migration, mapper, adapter, or relational repository
- tags and source bindings remain contract-level collections; their later physical representation is intentionally deferred

## Explicitly not included
- Prisma schema or SQL migration changes
- monitored-symbol relational adapter or repository implementation
- changes to catalog validation or status behavior
- signal-candidate schema changes
- runtime ingestion, exchange connectors, or UI work

## Follow-up
- define the monitored-symbol Prisma physical schema and migration
