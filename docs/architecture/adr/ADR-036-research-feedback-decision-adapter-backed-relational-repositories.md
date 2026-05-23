# ADR-036: Research Feedback Decision Adapter-Backed Relational Repositories

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
- the logical durable contract for `research_feedback_decision`
- the committed Prisma schema and SQL migration for `research_feedback_decision`

What was still missing for `research_feedback_decision` was the executable repository layer:
- adapter contract
- in-memory validation harness
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level integration coverage

Without that layer, the first downstream review/governance entity still did not match the persistence boundary quality of the already-implemented core-chain entities.

## Decision
Implement the adapter-backed relational repository rollout for `research_feedback_decision` now.

This includes:
- durable adapter contract
- in-memory adapter harness
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared repository composition
- opt-in real-Postgres integration coverage

## Consequences
Positive:
- `research_feedback_decision` now reaches the same per-entity durable parity as the core research chain
- feedback-decision reference validation and optimistic version semantics are enforced consistently across in-memory and Prisma-backed persistence paths
- the next persistence task can move to shared bundle extension and broader end-to-end integration

Tradeoffs:
- the shared implemented-product Prisma bundle still stops at `setup_aggregate_result`
- approval/review/execution durable slices are still deferred until after the feedback-decision bundle extension is verified

## Explicitly not included
- extending the shared implemented-product bundle through `research_feedback_decision`
- `research_decision_approval` persistence
- runtime approval/review engines
- exchange ingestion
- UI work

## Follow-up
- extend the shared implemented-product Prisma-backed repository bundle through `research_feedback_decision`
- add end-to-end real-database integration coverage across setup -> candidate -> evaluation -> aggregate -> feedback decision flows
