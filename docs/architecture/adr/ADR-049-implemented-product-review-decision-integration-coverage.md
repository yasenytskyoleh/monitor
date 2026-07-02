# ADR-049: Implemented Product Review Decision Integration Coverage

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `research_review_decision`
- per-entity durable relational parity for `research_review_decision`
- opt-in real-Postgres integration coverage through `research_decision_approval`

That meant the remaining proof gap was narrow: the review-decision entity was composed into the shared bundle, but the end-to-end real-database integration path still stopped before review-decision persistence.

## Decision
Extend the shared real-Postgres integration coverage through `research_review_decision`.

This includes:
- adding the review-decision migration into the shared integration harness
- persisting review-decision records through the shared repository bundle against real Postgres
- asserting one invalid review-decision hypothesis-linkage path against the same real-database harness

## Consequences
Positive:
- the full implemented product chain now has one verified end-to-end real-database persistence flow through review decisions
- review-decision reference validation is now proven across:
  - in-memory adapters
  - fake Prisma adapter tests
  - real Postgres integration coverage
- the next persistence step can move to the next downstream routed-action persistence layer

Tradeoffs:
- later review/execution entities still have only implemented in-memory persistence
- the review-decision integration harness is still opt-in and depends on `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL`

## Explicitly not included
- repository adapter contract work for `routed_action_execution_envelope`
- later review/execution durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- the durable relational contract for `routed_action_execution_envelope` is completed in ADR-050
- the Prisma physical schema and SQL migration for `routed_action_execution_envelope` are completed in ADR-051
- the repository adapter contract for `routed_action_execution_envelope` is completed in ADR-052
- add the adapter-backed relational repository and concrete Prisma adapter for `routed_action_execution_envelope`
