# ADR-047: Research Review Decision Adapter-Backed Relational Repositories

## Status
Accepted

## Context
The repo already had:
- durable relational parity for the current core research chain:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
- durable relational parity for downstream review/approval entities:
  - `research_feedback_decision`
  - `research_decision_approval`
- the logical durable contract, committed Prisma schema, and adapter boundary for:
  - `research_review_decision`

What was still missing for `research_review_decision` was the executable repository layer:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared composition

Without that layer, the downstream review-decision entity still lagged behind the rest of the implemented product chain in persistence-boundary quality and enforcement.

## Decision
Implement the adapter-backed relational repository rollout for `research_review_decision` now.

This includes:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared repository composition
- explicit persistence-boundary validation for optional `research_hypothesis` references

## Consequences
Positive:
- `research_review_decision` now reaches the same per-entity durable parity as the core research chain, `research_feedback_decision`, and `research_decision_approval`
- optional hypothesis-reference validation is enforced consistently across the in-memory harness and the Prisma-backed adapter
- the next persistence task can move to shared-bundle extension and real-database integration instead of another per-entity contract pass

Tradeoffs:
- the shared implemented-product Prisma bundle still stops at `research_decision_approval`
- opt-in real-Postgres integration coverage does not yet include the review-decision slice

## Explicitly not included
- extending the shared implemented-product bundle through `research_review_decision`
- review-decision-slice opt-in real-Postgres integration coverage
- later review/execution durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- shared implemented-product Prisma-backed repository bundle extension through `research_review_decision` is completed in ADR-048
- opt-in real-database integration path through `research_review_decision` is completed in ADR-049
