# ADR-059: Setup Lifecycle Mutation Record Adapter-Backed Relational Repositories

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
  - `routed_action_execution_envelope`
- the logical durable contract, committed Prisma schema, and adapter boundary for:
  - `setup_lifecycle_mutation_record`

What was still missing for `setup_lifecycle_mutation_record` was the executable repository layer:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared composition

Without that layer, the first downstream mutation-audit entity still lagged behind the rest of the implemented product chain in persistence-boundary quality and enforcement.

## Decision
Implement the adapter-backed relational repository rollout for `setup_lifecycle_mutation_record` now.

This includes:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared repository composition
- explicit persistence-boundary validation for required `setup_definition`, `research_decision_approval`, and `research_feedback_decision` lineage consistency

## Consequences
Positive:
- `setup_lifecycle_mutation_record` now reaches the same per-entity durable parity as the core research chain, `research_feedback_decision`, `research_decision_approval`, `research_review_decision`, and `routed_action_execution_envelope`
- required setup/approval/feedback reference validation is enforced consistently across the in-memory harness and the Prisma-backed adapter
- the next persistence task can move to shared-bundle extension and real-database integration instead of another per-entity contract pass

Tradeoffs:
- the shared implemented-product Prisma bundle still stops at `routed_action_execution_envelope`
- opt-in real-Postgres integration coverage does not yet include the mutation-audit slice

## Explicitly not included
- extending the shared implemented-product bundle through `setup_lifecycle_mutation_record`
- extending opt-in real-Postgres integration coverage through `setup_lifecycle_mutation_record`
- later execution/mutation durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- extend shared implemented-product composition and opt-in real-database integration coverage through `setup_lifecycle_mutation_record`
