# ADR-068: Setup Definition Revision Durable Relational Contract

## Status
Accepted

## Context
The repo already has:
- one shared Prisma-backed repository bundle through `setup_refinement_request`
- one shared real-Postgres integration flow through `setup_refinement_request`
- `SetupDefinitionRevision` in the domain model
- implemented in-memory persistence and a service-owned write path for `SetupDefinitionRevision`

The next downstream persistence gap is now `setup_definition_revision`.

That entity already exists and participates in the refinement-driven revision flow, but it did not yet have an explicit durable relational contract. Without that contract, schema work for revision persistence would start from storage guesses instead of a defined boundary.

## Decision
Add a logical durable relational contract for `setup_definition_revision`.

The contract includes:
- one durable record type
- explicit setup-family and revision-number fields
- optional previous-revision and previous-setup lineage fields
- required source refinement-request lineage
- optional approval and feedback lineage carry-through
- standard product-domain metadata and optimistic version semantics

## Consequences
Positive:
- the first later downstream revision slice now has an explicit logical storage contract
- physical schema work can stay narrow and deterministic
- the repo preserves the pattern of contract first, schema second, adapters third

Tradeoffs:
- this step does not yet add Prisma schema or SQL migration artifacts
- revision-chain validation remains service-owned in this contract step
- repository adapters, shared-bundle extension, and integration coverage remain outside durable relational parity for this slice

## Explicitly not included
- Prisma schema or migration changes
- repository adapter contracts
- domain/durable mappers
- adapter-backed relational repositories
- concrete Prisma adapter wiring
- shared implemented-product bundle or integration extension through `setup_definition_revision`
- runtime execution engines
- UI work

## Follow-up
- the Prisma physical schema and SQL migration for `setup_definition_revision` are completed in ADR-069
