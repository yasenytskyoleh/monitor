# ADR-048: Implemented Product Review Decision Composition

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `research_decision_approval`
- per-entity durable relational parity for `research_review_decision`

That meant the repo still lacked one shared proof that the full implemented product chain, including the downstream review-decision entity, could run together through a single Prisma-backed repository bundle.

## Decision
Extend the shared implemented-product repository composition and shared Prisma-backed bundle through `research_review_decision`.

This includes:
- adding the review-decision adapter into the shared composition
- extending the shared Prisma adapter bundle type
- extending the shared repository bundle type through review decisions

## Consequences
Positive:
- the full implemented product chain now has one coherent shared persistence bundle through review decisions
- shared bundle coverage now reaches the downstream review-decision entity
- the next persistence task can stay focused on the next downstream durable slice rather than more composition work

Tradeoffs:
- the end-to-end real-Postgres integration flow still stops at `research_decision_approval`
- later review/execution durable slices remain separate from this shared bundle

## Explicitly not included
- review-decision-chain real-Postgres integration coverage
- later review/execution durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- extend the end-to-end real-database integration flow through setup -> candidate -> evaluation -> aggregate -> feedback decision -> approval -> review decision
