# ADR-064: Setup Refinement Request Relational Adapter Contract

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `setup_refinement_request`
- the committed Prisma schema and SQL migration for that refinement-follow-up slice
- and an in-memory domain repository for setup-refinement requests

The next missing layer was the adapter boundary between a future relational repository and physical refinement-follow-up storage.

Without that contract, the later repository and Prisma adapter step would risk:
- leaking physical reference checks into repository code inconsistently
- changing deterministic failure behavior implicitly
- and adding update-oriented adapter surface even though the setup-refinement-request repository is create-only today

## Decision
Adopt a relational adapter contract for `setup_refinement_request`.

Decision rules:
- the adapter remains durable-record-facing
- the current public operations are `load`, `listBySetupDefinitionId`, `listByResearchDecisionApprovalId`, and `insert`
- deterministic persistence failures map to:
  - `already_exists`
  - `invalid_reference`
- retryable persistence failures map to:
  - `transient_failure`
  - `unknown_failure`
- the adapter validates:
  - referenced `setup_definition` existence
  - referenced `research_decision_approval` existence
  - referenced `research_feedback_decision` existence
  - approval/setup consistency for the refinement request
  - approval/feedback consistency for the refinement request
  - feedback-decision/setup consistency for the refinement request

The adapter intentionally does not validate:
- approval outcome authorization
- `authorizedNextAction = refine_definition`
- later assignment/status workflow legality

Those remain service-owned business rules rather than persistence-boundary reference checks in this step.

## Consequences
Positive:
- the refinement-follow-up slice now has an explicit adapter boundary before repository/Prisma wiring
- the create-only nature of setup-refinement requests stays reflected in the persistence surface
- deterministic failure handling can be tested independently of DB runtime wiring

Tradeoffs:
- this adds another narrow contract layer before the repository implementation lands
- the full repository/Prisma rollout is still incomplete at this contract step

## Explicitly postponed at this contract step
- domain/durable mappers, adapter-backed relational repository implementation, and concrete Prisma adapter wiring
- shared implemented-product bundle extension through `setup_refinement_request`
- opt-in real-Postgres integration coverage through `setup_refinement_request`

## Follow-up
- the adapter-backed relational repository and concrete Prisma adapter for `setup_refinement_request` are completed in ADR-065
