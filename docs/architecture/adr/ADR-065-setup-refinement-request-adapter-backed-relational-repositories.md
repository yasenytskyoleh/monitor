# ADR-065: Setup Refinement Request Adapter-Backed Relational Repositories

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
- durable relational parity for downstream governance and execution entities:
  - `research_feedback_decision`
  - `research_decision_approval`
  - `research_review_decision`
  - `routed_action_execution_envelope`
  - `setup_lifecycle_mutation_record`
- the logical durable contract, committed Prisma schema, and adapter boundary for:
  - `setup_refinement_request`

What was still missing for `setup_refinement_request` was the executable repository layer:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared composition

Without that layer, the first later downstream refinement-follow-up entity still lagged behind the rest of the implemented product chain in persistence-boundary quality and enforcement.

## Decision
Implement the adapter-backed relational repository rollout for `setup_refinement_request` now.

This includes:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared repository composition
- explicit persistence-boundary validation for required `setup_definition`, `research_decision_approval`, and `research_feedback_decision` lineage consistency

## Consequences
Positive:
- `setup_refinement_request` now reaches the same per-entity durable parity as the core research chain, `research_feedback_decision`, `research_decision_approval`, `research_review_decision`, `routed_action_execution_envelope`, and `setup_lifecycle_mutation_record`
- required setup/approval/feedback reference validation is enforced consistently across the in-memory harness and the Prisma-backed adapter
- the next persistence task can move to shared-bundle extension and real-database integration instead of another per-entity repository pass

Tradeoffs:
- the shared implemented-product Prisma bundle still stops at `setup_lifecycle_mutation_record`
- opt-in real-Postgres integration coverage does not yet include the refinement-follow-up slice

## Explicitly not included
- extending the shared implemented-product bundle through `setup_refinement_request`
- extending opt-in real-Postgres integration coverage through `setup_refinement_request`
- later execution/mutation durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- shared implemented-product composition through `setup_refinement_request` is completed later in ADR-066
- extend opt-in real-database integration coverage through `setup_refinement_request`
