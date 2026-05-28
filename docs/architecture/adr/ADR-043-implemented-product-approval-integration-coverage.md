# ADR-043: Implemented Product Approval Integration Coverage

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `research_decision_approval`
- per-entity durable relational parity for `research_decision_approval`
- opt-in real-Postgres integration coverage through `research_feedback_decision`

That meant the remaining proof gap was narrow: the approval entity was composed into the shared bundle, but the end-to-end real-database integration path still stopped before approval persistence.

## Decision
Extend the shared real-Postgres integration coverage through `research_decision_approval`.

This includes:
- adding the approval migration into the shared integration harness
- persisting approval records through the shared repository bundle against real Postgres
- asserting one invalid approval setup-linkage path against the same real-database harness

## Consequences
Positive:
- the full implemented product chain now has one verified end-to-end real-database persistence flow
- approval reference validation is now proven across:
  - in-memory adapters
  - fake Prisma adapter tests
  - real Postgres integration coverage
- the next persistence step can move to the next downstream durable slice

Tradeoffs:
- later review/execution entities still have only implemented in-memory persistence
- the approval integration harness is still opt-in and depends on `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL`

## Explicitly not included
- durable relational contract work for `research_review_decision`
- later review/execution durable slices
- runtime approval/review engines
- exchange ingestion
- UI work

## Follow-up
- define the first durable relational contract for `research_review_decision`
