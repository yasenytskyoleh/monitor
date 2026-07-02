# ADR-052: Routed Action Execution Envelope Relational Adapter Contract

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `routed_action_execution_envelope`
- the committed Prisma schema and SQL migration for that execution-envelope slice
- and in-memory domain repositories for the execution-envelope artifact

The next missing layer was the adapter boundary between a relational repository and physical execution-envelope storage.

Without that contract, the later repository and Prisma adapter step would risk:
- leaking physical reference checks into repository code inconsistently
- changing deterministic failure behavior implicitly
- and adding update-oriented adapter surface even though the execution-envelope repository is create-only today

## Decision
Adopt a relational adapter contract for `routed_action_execution_envelope`.

Decision rules:
- the adapter remains durable-record-facing
- the current public operations are `load`, `listBySourceReviewDecisionId`, and `insert`
- deterministic persistence failures map to:
  - `already_exists`
  - `invalid_reference`
- retryable persistence failures map to:
  - `transient_failure`
  - `unknown_failure`
- the adapter validates:
  - required referenced `research_review_decision` existence through `sourceReviewDecisionId`

The adapter intentionally does not validate:
- `source_routing_result_id`
- target refs inside `target_entity_refs`

Those remain service-owned/query-owned references rather than durable entity FKs in this step.

## Consequences
Positive:
- the execution-envelope slice now has an explicit adapter boundary before repository/Prisma wiring
- the create-only nature of routed-action execution envelopes stays reflected in the persistence surface
- deterministic failure handling can be tested independently of DB runtime wiring

Tradeoffs:
- this adds another narrow contract layer before the repository implementation lands
- the full repository/Prisma rollout is completed later in ADR-053

## Explicitly postponed
- domain/durable mappers, adapter-backed relational repository implementation, and concrete Prisma adapter wiring are completed later in ADR-053
- shared implemented-product relational bundle extension through `routed_action_execution_envelope`
- opt-in real-Postgres integration coverage through `routed_action_execution_envelope`

## Follow-up
- the adapter-backed relational repository and concrete Prisma adapter for `routed_action_execution_envelope` are completed in ADR-053
