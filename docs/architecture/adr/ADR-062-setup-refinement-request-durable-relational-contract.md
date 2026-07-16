# ADR-062: Setup Refinement Request Durable Relational Contract

## Status
Accepted

## Context
The repo already has:
- one shared Prisma-backed repository bundle through `setup_lifecycle_mutation_record`
- one shared real-Postgres integration flow through `setup_lifecycle_mutation_record`
- `SetupRefinementRequest` in the domain model
- implemented in-memory persistence and a service-owned write path for `SetupRefinementRequest`

The first later downstream execution/mutation persistence slice has now been selected as `setup_refinement_request`.

That entity already exists and participates in the approved `refine_definition` follow-up flow, but it did not yet have an explicit durable relational contract. Without that contract, schema work for the refinement-follow-up slice would start from storage guesses instead of a defined boundary.

## Decision
Add a logical durable relational contract for `setup_refinement_request`.

The contract includes:
- one durable record type
- required setup, approval, and feedback-decision lineage references
- explicit refinement-status and request-audit fields
- normalized evidence references
- nullable reviewer/owner assignment fields
- standard product-domain metadata and optimistic version semantics

## Consequences
Positive:
- the first later downstream refinement-follow-up slice now has an explicit logical storage contract
- physical schema work can stay narrow and deterministic
- the repo preserves the pattern of contract first, schema second, adapters third

Tradeoffs:
- this step does not yet add Prisma schema or SQL migration artifacts
- approval/setup/feedback cross-entity consistency remains service-owned in this contract step
- repository adapters, shared-bundle extension, and integration coverage remain outside durable relational parity for this slice

## Explicitly not included
- Prisma schema or migration changes
- repository adapter contracts
- domain/durable mappers
- adapter-backed relational repositories
- concrete Prisma adapter wiring
- shared implemented-product bundle or integration extension through `setup_refinement_request`
- runtime execution engines
- UI work

## Follow-up
- the Prisma physical schema and SQL migration for `setup_refinement_request` are completed in ADR-063
- the adapter-backed relational repository rollout for `setup_refinement_request` is completed in ADR-065
