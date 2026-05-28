# ADR-042: Implemented Product Approval Composition

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through the implemented research chain and `research_feedback_decision`
- per-entity durable relational parity for `research_decision_approval`

That meant the repo still lacked one shared proof that the full implemented product chain, including the first downstream approval entity, could run together through a single Prisma-backed repository bundle.

## Decision
Extend the shared implemented-product repository composition and shared Prisma-backed bundle through `research_decision_approval`.

This includes:
- adding the approval adapter into the shared composition
- extending the shared Prisma adapter bundle type
- extending the shared repository bundle type through approvals

## Consequences
Positive:
- the full implemented product chain now has one coherent shared persistence bundle
- shared bundle coverage now reaches the first downstream approval entity
- the next persistence task can stay focused on real-database integration coverage rather than more composition work

Tradeoffs:
- the end-to-end real-Postgres integration flow still stops at `research_feedback_decision`
- later review/execution durable slices remain separate from this shared bundle

## Explicitly not included
- approval-chain real-Postgres integration coverage
- later review/execution durable slices
- runtime approval/review engines
- exchange ingestion
- UI work

## Follow-up
- extend the end-to-end real-database integration flow through setup -> candidate -> evaluation -> aggregate -> feedback decision -> approval
