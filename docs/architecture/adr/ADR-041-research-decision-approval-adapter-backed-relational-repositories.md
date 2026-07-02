# ADR-041: Research Decision Approval Adapter-Backed Relational Repositories

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
- durable relational parity for the first downstream review entity:
  - `research_feedback_decision`
- the logical durable contract, committed Prisma schema, and adapter boundary for:
  - `research_decision_approval`

What was still missing for `research_decision_approval` was the executable repository layer:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared composition

Without that layer, the first downstream approval entity still lagged behind the rest of the implemented product chain in persistence-boundary quality and enforcement.

## Decision
Implement the adapter-backed relational repository rollout for `research_decision_approval` now.

This includes:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared repository composition
- explicit repository-level validation that the approval setup definition matches the referenced feedback decision

## Consequences
Positive:
- `research_decision_approval` now reaches the same per-entity durable parity as the core research chain and `research_feedback_decision`
- approval/reference validation is enforced consistently across the in-memory harness and the Prisma-backed adapter
- the next persistence task can move to shared-bundle extension and real-database integration instead of another per-entity contract pass

Tradeoffs:
- the shared implemented-product Prisma bundle still stops at `research_feedback_decision`
- opt-in real-Postgres integration coverage does not yet include the approval slice

## Explicitly not included
- extending the shared implemented-product bundle through `research_decision_approval` is completed later in ADR-042
- approval-slice opt-in real-Postgres integration coverage
- later review/execution durable slices
- runtime approval/review engines
- exchange ingestion
- UI work

## Follow-up
- shared implemented-product Prisma-backed repository bundle extension through `research_decision_approval` is completed later in ADR-042
- opt-in real-database integration coverage across setup -> candidate -> evaluation -> aggregate -> feedback decision -> approval flows is completed later in ADR-043
