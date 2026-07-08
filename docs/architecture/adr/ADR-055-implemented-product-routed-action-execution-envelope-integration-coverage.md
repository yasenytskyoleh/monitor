# ADR-055: Implemented Product Routed Action Execution Envelope Integration Coverage

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `routed_action_execution_envelope`
- per-entity durable relational parity for `routed_action_execution_envelope`
- opt-in real-Postgres integration coverage through `research_review_decision`

That meant the remaining proof gap was narrow: the execution-envelope entity was composed into the shared bundle, but the end-to-end real-database integration path still stopped before execution-envelope persistence.

## Decision
Extend the shared real-Postgres integration coverage through `routed_action_execution_envelope`.

This includes:
- adding the routed-action migration into the shared integration harness
- persisting execution-envelope records through the shared repository bundle against real Postgres
- asserting one invalid routed-action review-decision linkage path against the same real-database harness

## Consequences
Positive:
- the full implemented product chain now has one verified end-to-end real-database persistence flow through routed-action execution envelopes
- routed-action reference validation is now proven across:
  - in-memory adapters
  - fake Prisma adapter tests
  - real Postgres integration coverage
- the next downstream persistence work can move to `setup_lifecycle_mutation_record` without revisiting execution-envelope-chain infrastructure

Tradeoffs:
- downstream mutation-audit shared-bundle extension and real-database integration coverage still remain pending after this step and are completed later in ADR-060 and ADR-061
- the routed-action integration harness is still opt-in and depends on `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL`

## Explicitly not included
- durable relational contract/schema and executable repository follow-up work for `setup_lifecycle_mutation_record`, which are completed later in ADR-056, ADR-057, and ADR-059
- later execution/mutation durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- extend the shared implemented-product relational bundle and opt-in real-database integration coverage through `setup_lifecycle_mutation_record`, completed later in ADR-060 and ADR-061
