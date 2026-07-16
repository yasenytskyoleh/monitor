# ADR-079: Implemented Product Setup Revision Activation Integration Coverage

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `setup_revision_activation_record`
- per-entity durable relational parity for `setup_revision_activation_record`
- opt-in real-Postgres integration coverage through `setup_definition_revision`

That meant the remaining proof gap was narrow: the activation-audit slice was already composed into the shared bundle, but the end-to-end real-database integration path still stopped before activation-record persistence.

## Decision
Extend the shared real-Postgres integration coverage through `setup_revision_activation_record`.

This includes:
- adding the setup-revision-activation-record migration into the shared integration harness
- persisting setup-revision activation records through the shared repository bundle against real Postgres
- asserting one invalid setup-revision-activation target-revision linkage path against the same real-database harness

## Consequences
Positive:
- the full implemented product chain now has one verified end-to-end real-database persistence flow through `setup_revision_activation_record`
- setup-revision-activation reference validation is now proven across:
  - in-memory adapters
  - fake Prisma adapter tests
  - real Postgres integration coverage
- the next downstream persistence work can move to later downstream execution/mutation durable-slice selection without revisiting the activation shared persistence boundary

Tradeoffs:
- later downstream execution/mutation durable slices still remain pending after this step
- the setup-revision-activation integration harness is still opt-in and depends on `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL`

## Explicitly not included
- later downstream execution/mutation durable slices after `setup_revision_activation_record`
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- select the next later downstream execution/mutation durable slice after `setup_revision_activation_record`
- commit that next slice's durable relational contract and physical schema plan before another adapter/repository rollout
