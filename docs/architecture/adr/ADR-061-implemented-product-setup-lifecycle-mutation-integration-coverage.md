# ADR-061: Implemented Product Setup Lifecycle Mutation Integration Coverage

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `setup_lifecycle_mutation_record`
- per-entity durable relational parity for `setup_lifecycle_mutation_record`
- opt-in real-Postgres integration coverage through `routed_action_execution_envelope`

That meant the remaining proof gap was narrow: the mutation-audit entity was composed into the shared bundle, but the end-to-end real-database integration path still stopped before setup-lifecycle mutation persistence.

## Decision
Extend the shared real-Postgres integration coverage through `setup_lifecycle_mutation_record`.

This includes:
- adding the setup-lifecycle mutation migration into the shared integration harness
- persisting setup-lifecycle mutation records through the shared repository bundle against real Postgres
- asserting one invalid setup-lifecycle approval linkage path against the same real-database harness

## Consequences
Positive:
- the full implemented product chain now has one verified end-to-end real-database persistence flow through setup-lifecycle mutation records
- setup-lifecycle reference validation is now proven across:
  - in-memory adapters
  - fake Prisma adapter tests
  - real Postgres integration coverage
- the next downstream persistence work can move to later execution/mutation durable slices without revisiting shared persistence infrastructure

Tradeoffs:
- later downstream execution/mutation durable slices still remain pending after this step
- the setup-lifecycle integration harness is still opt-in and depends on `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL`

## Explicitly not included
- later downstream execution/mutation durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- define the first later downstream execution/mutation durable slice after `setup_lifecycle_mutation_record`
