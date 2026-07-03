# ADR-053: Routed Action Execution Envelope Adapter-Backed Relational Repositories

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
- durable relational parity for downstream governance entities:
  - `research_feedback_decision`
  - `research_decision_approval`
  - `research_review_decision`
- the logical durable contract, committed Prisma schema, and adapter boundary for:
  - `routed_action_execution_envelope`

What was still missing for `routed_action_execution_envelope` was the executable repository layer:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared composition

Without that layer, the first downstream execution-envelope entity still lagged behind the rest of the implemented product chain in persistence-boundary quality and enforcement.

## Decision
Implement the adapter-backed relational repository rollout for `routed_action_execution_envelope` now.

This includes:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared repository composition
- explicit persistence-boundary validation for required `research_review_decision` references

## Consequences
Positive:
- `routed_action_execution_envelope` now reaches the same per-entity durable parity as the core research chain, `research_feedback_decision`, `research_decision_approval`, and `research_review_decision`
- required review-decision reference validation is enforced consistently across the in-memory harness and the Prisma-backed adapter
- the next persistence task can move to shared-bundle extension and real-database integration instead of another per-entity contract pass

Tradeoffs:
- the shared implemented-product Prisma bundle still stops at `research_review_decision`
- opt-in real-Postgres integration coverage does not yet include the execution-envelope slice

## Explicitly not included
- extending the shared implemented-product bundle through `routed_action_execution_envelope`
- execution-envelope-slice opt-in real-Postgres integration coverage
- later execution/mutation durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- extending the shared implemented-product relational bundle through `routed_action_execution_envelope` is completed in ADR-054
- extend opt-in real-database integration coverage through `routed_action_execution_envelope`
