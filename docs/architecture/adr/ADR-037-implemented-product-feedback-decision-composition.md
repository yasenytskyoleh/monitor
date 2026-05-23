# ADR-037: Implemented Product Feedback-Decision Composition

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle for the core research chain:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
- per-entity durable relational parity for `research_feedback_decision`

That meant the repo still lacked one shared proof that the full implemented research chain, including the first downstream review/governance entity, could run together through a single Prisma-backed repository bundle.

## Decision
Extend the shared implemented-product repository composition and shared Prisma-backed bundle through `research_feedback_decision`.

This includes:
- adding the feedback-decision adapter into the shared composition
- extending the shared Prisma adapter bundle type
- extending the real-Postgres integration flow through setup -> candidate -> evaluation -> aggregate -> feedback decision

## Consequences
Positive:
- the full implemented research chain now has one coherent shared persistence bundle
- shared bundle coverage now reaches the first downstream review/governance entity
- the next persistence task can move into the `research_decision_approval` slice

Tradeoffs:
- the shared bundle still stops before approval and later review/execution entities
- runtime review/execution orchestration remains separate from this persistence step

## Explicitly not included
- `research_decision_approval` storage contracts or schema work
- new review-policy business rules
- runtime approval/review engines
- exchange ingestion
- UI work

## Follow-up
- the durable relational contract for `research_decision_approval` is completed later in `ADR-038`
