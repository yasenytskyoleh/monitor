# ADR-058: Setup Lifecycle Mutation Record Relational Adapter Contract

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `setup_lifecycle_mutation_record`
- the committed Prisma schema and SQL migration for that mutation-audit slice
- and in-memory domain repositories for the setup-lifecycle mutation artifact

The next missing layer was the adapter boundary between a future relational repository and physical mutation-audit storage.

Without that contract, the later repository and Prisma adapter step would risk:
- leaking physical reference checks into repository code inconsistently
- changing deterministic failure behavior implicitly
- and adding update-oriented adapter surface even though the setup-lifecycle-mutation repository is create-only today

## Decision
Adopt a relational adapter contract for `setup_lifecycle_mutation_record`.

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
  - approval/setup consistency for the mutation record
  - approval/feedback consistency for the mutation record
  - feedback-decision/setup consistency for the mutation record

The adapter intentionally does not validate:
- approval outcome authorization
- approved-action correspondence with the referenced approval record
- lifecycle transition legality between `previousStatus` and `newStatus`

Those remain service-owned business rules rather than persistence-boundary reference checks in this step.

## Consequences
Positive:
- the mutation-audit slice now has an explicit adapter boundary before repository/Prisma wiring
- the create-only nature of setup-lifecycle mutation records stays reflected in the persistence surface
- deterministic failure handling can be tested independently of DB runtime wiring

Tradeoffs:
- this adds another narrow contract layer before the repository implementation lands
- the full repository/Prisma rollout is still incomplete until the next step

## Explicitly postponed
- domain/durable mappers
- adapter-backed relational repository implementation
- concrete Prisma adapter wiring
- shared implemented-product bundle extension through `setup_lifecycle_mutation_record`
- opt-in real-Postgres integration coverage through `setup_lifecycle_mutation_record`

## Follow-up
- domain/durable mappers, adapter-backed repository, and concrete Prisma adapter rollout for `setup_lifecycle_mutation_record` are the next step
