# ADR-040: Research Decision Approval Relational Adapter Contract

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `research_decision_approval`
- the committed Prisma schema and SQL migration for that approval slice
- and in-memory domain repositories for the approval artifact

The next missing layer was the adapter boundary between a future relational repository and physical approval storage.

Without that contract, the later repository and Prisma adapter step would risk:
- leaking physical reference checks into repository code inconsistently
- changing deterministic failure behavior implicitly
- and adding update-oriented adapter surface even though the approval repository is create-only today

## Decision
Adopt a relational adapter contract for `research_decision_approval`.

Decision rules:
- the adapter remains durable-record-facing
- the current public operations are `load`, `listByFeedbackDecisionId`, and `insert`
- deterministic persistence failures map to:
  - `already_exists`
  - `invalid_reference`
- retryable persistence failures map to:
  - `transient_failure`
  - `unknown_failure`
- the adapter validates:
  - referenced `research_feedback_decision` existence
  - referenced `setup_definition` existence
  - feedback-decision/setup consistency for the approval record

## Consequences
Positive:
- the approval slice now has an explicit adapter boundary before repository/prisma wiring
- the create-only nature of approvals stays reflected in the persistence surface
- deterministic failure handling can be tested independently of DB runtime wiring

Tradeoffs:
- this adds another narrow contract layer before the repository implementation lands
- the full repository/prisma rollout is still incomplete until the next step

## Explicitly postponed
- domain/durable mappers
- adapter-backed relational repository implementation
- concrete Prisma adapter wiring
- shared implemented-product bundle extension through approvals

## Follow-up
- domain/durable mappers, adapter-backed repository, and concrete Prisma adapter rollout for `research_decision_approval` is completed later in ADR-041
