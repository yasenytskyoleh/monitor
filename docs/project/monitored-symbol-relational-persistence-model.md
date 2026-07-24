# Monitored Symbol Relational Persistence Model

## Purpose
Define the durable relational contract for `MonitoredSymbol`, the catalog entity referenced by signal candidates.

## Implemented artifact locations
- `packages/domain-model/src/monitoring/monitored-symbol.ts`
- `packages/domain-model/src/repositories/monitored-symbol-repository.ts`
- `packages/domain-model/src/repositories/monitored-symbol-repository.impl.ts`
- `packages/domain-model/src/repositories/monitored-symbol-relational-repository-adapter.ts`
- `packages/domain-model/src/services/monitoring-catalog-service.ts`
- `packages/domain-model/src/storage/monitored-symbol-relational-slice.ts`
- `packages/domain-model/src/storage/monitored-symbol-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260724103000_product_domain_monitored_symbol_relational_v1/migration.sql`
- `packages/domain-model/test/monitoring-catalog-persistence.test.ts`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `packages/domain-model/test/monitored-symbol-relational-repository-adapter-contracts.test.ts`
- `docs/architecture/adr/ADR-087-monitored-symbol-durable-relational-contract.md`
- `docs/architecture/adr/ADR-089-monitored-symbol-relational-adapter-contract.md`

## Durable record shape
`MonitoredSymbolDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema-version fields
- immutable catalog identity in both `identity.entityId` and `symbolId`
- base and quote assets, display name, market scope, catalog status, and provider hint
- tags and source bindings in their existing domain shapes

## Reference and ownership rules
- `monitored_symbol` is owned by `monitoring_catalog_service`
- signal candidates reference the catalog through `monitoredSymbolId`
- source bindings remain values owned by the catalog record; this contract does not introduce independent source-binding identities

## Versioning and write semantics
- `storageSchemaVersion` is `product_domain.relational.v1`
- create begins at `identity.version = 1`
- catalog updates and status changes use the existing optimistic-version boundary
- archive remains represented through standard lifecycle fields and the catalog status

## Physical schema rules
- `monitored_symbol_id` is the primary key and the persisted catalog identity
- `symbol_status`, `market_scope`, and `provider_hint` use dedicated enums
- tags use a required Postgres text array and source bindings use a required JSON array
- indexes support catalog status and market-scope/status reads
- checks enforce non-empty identity/catalog text, source-binding array shape, positive versions, timestamp order, and lifecycle/status archive consistency
- signal candidates remain unchanged in this step; their existing `monitored_symbol_id` is not converted into a foreign key here

## What remains pending
- mapper, relational repository, Prisma adapter, shared-composition, and integration rollout
