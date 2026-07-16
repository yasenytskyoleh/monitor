# ADR-067: Implemented Product Setup Refinement Request Integration Coverage

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `setup_refinement_request`
- per-entity durable relational parity for `setup_refinement_request`
- opt-in real-Postgres integration coverage through `setup_lifecycle_mutation_record`

That meant the remaining proof gap was narrow: the refinement-follow-up entity was composed into the shared bundle, but the end-to-end real-database integration path still stopped before setup-refinement-request persistence.

## Decision
Extend the shared real-Postgres integration coverage through `setup_refinement_request`.

This includes:
- adding the setup-refinement-request migration into the shared integration harness
- persisting setup-refinement requests through the shared repository bundle against real Postgres
- asserting one invalid setup-refinement approval linkage path against the same real-database harness

## Consequences
Positive:
- the full implemented product chain now has one verified end-to-end real-database persistence flow through `setup_refinement_request`
- setup-refinement reference validation is now proven across:
  - in-memory adapters
  - fake Prisma adapter tests
  - real Postgres integration coverage
- the next downstream persistence work can move to later execution/revision durable slices without revisiting shared persistence infrastructure

Tradeoffs:
- later downstream execution/mutation durable slices still remain pending after this step
- the setup-refinement integration harness is still opt-in and depends on `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL`

## Explicitly not included
- later downstream execution/mutation durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- the revision-slice contract/schema and adapter-contract steps are now complete
- the revision-slice repository rollout is completed later in ADR-071
- shared implemented-product composition through `setup_definition_revision` is completed later in ADR-072
- opt-in real-database integration through `setup_definition_revision` is completed later in ADR-073
