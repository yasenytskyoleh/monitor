# ADR-071: Setup Definition Revision Adapter-Backed Relational Repositories

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
  - `setup_refinement_request`
- the logical durable contract, committed Prisma schema, and adapter boundary for:
  - `setup_definition_revision`

What was still missing for `setup_definition_revision` was the executable repository layer:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared composition

Without that layer, the first revision-tracking slice still lagged behind the rest of the implemented product chain in persistence-boundary quality and enforcement.

## Decision
Implement the adapter-backed relational repository rollout for `setup_definition_revision` now.

This includes:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared repository composition
- explicit persistence-boundary validation for required setup-definition and setup-refinement-request lineage, plus optional approval/feedback lineage consistency

## Consequences
Positive:
- `setup_definition_revision` now reaches the same per-entity durable parity as the core research chain and later downstream governance/execution slices through `setup_refinement_request`
- required revision-lineage and source-request/approval/feedback validation is enforced consistently across the in-memory harness and the Prisma-backed adapter
- the next persistence task can move to shared-bundle extension and real-database integration instead of another per-entity repository pass

Tradeoffs:
- the shared implemented-product Prisma bundle still stops at `setup_refinement_request`
- opt-in real-Postgres integration coverage does not yet include the revision slice

## Explicitly not included
- extending the shared implemented-product bundle through `setup_definition_revision`
- extending opt-in real-Postgres integration coverage through `setup_definition_revision`
- later downstream `setup_revision_activation_record` durability work
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- shared implemented-product composition through `setup_definition_revision` is completed later in ADR-072
- opt-in real-database integration through `setup_definition_revision` is completed later in ADR-073
- the durable relational contract for `setup_revision_activation_record` is completed later in ADR-074
- the Prisma physical schema and SQL migration for `setup_revision_activation_record` are completed later in ADR-075
