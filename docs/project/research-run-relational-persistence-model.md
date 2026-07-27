# Research Run Relational Persistence Model

## Purpose

Define the initial durable relational contract for `ResearchRun`, the product-domain record that groups a hypothesis evaluation run.

## Implemented artifact locations

- `packages/domain-model/src/research-run.ts`
- `packages/domain-model/src/storage/research-run-relational-slice.ts`
- `packages/domain-model/prisma/migrations/20260727103000_product_domain_research_run_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/research-run-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/research-run-relational-prisma-client.ts`
- `docs/architecture/adr/ADR-090-research-run-durable-relational-contract.md`

## Durable record shape

`ResearchRunDurableRecord` keeps:

- standard product-domain identity, lifecycle, metadata, archive, schema-version, and optimistic-version fields
- immutable run, hypothesis, and setup identifiers
- candidate, evaluation-window, and evaluation-result identifier collections
- run status, started/completed timestamps, and optional summary

## Reference and ownership rules

- `research_run` is a product-domain record; it is not a runtime-evidence artifact
- `identity.relatedEntityIds` snapshots the hypothesis, setup, candidate, and evaluation-result references observed by the run
- the existing optional aggregate-scope `researchRunId` remains a reference only; this contract does not add a foreign key or change aggregate behavior

## Delivery status

- Prisma schema and migration define `product_domain.research_run` with optimistic-version,
  lifecycle, completion-timestamp, and archive-timestamp constraints
- durable mappers, public repository, in-memory adapter, and Prisma adapter support create,
  optimistic update, lookup by id or hypothesis, and status filtering
- standalone and shared Prisma composition expose `researchRunRepository`
- shared product integration coverage applies the migration and verifies a durable run row;
  it remains environment-gated until `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL` is configured
