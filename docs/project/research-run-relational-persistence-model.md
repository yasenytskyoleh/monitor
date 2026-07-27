# Research Run Relational Persistence Model

## Purpose

Define the initial durable relational contract for `ResearchRun`, the product-domain record that groups a hypothesis evaluation run.

## Implemented artifact locations

- `packages/domain-model/src/research-run.ts`
- `packages/domain-model/src/storage/research-run-relational-slice.ts`
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

## What remains pending

- physical Prisma schema and SQL migration
- mapper, repository adapter, and concrete repository implementation
- shared Prisma composition and real-Postgres integration coverage
