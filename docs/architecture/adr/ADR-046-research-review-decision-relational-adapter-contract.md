# ADR-046: Research Review Decision Relational Adapter Contract

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `research_review_decision`
- the committed Prisma schema and SQL migration for that review-decision slice
- and in-memory domain repositories for the review-decision artifact

The next missing layer was the adapter boundary between a relational repository and physical review-decision storage.

Without that contract, the later repository and Prisma adapter step would risk:
- leaking physical reference checks into repository code inconsistently
- changing deterministic failure behavior implicitly
- and adding update-oriented adapter surface even though the review-decision repository is create-only today

## Decision
Adopt a relational adapter contract for `research_review_decision`.

Decision rules:
- the adapter remains durable-record-facing
- the current public operations are `load`, `listByReviewPacketId`, `listBySetupFamilyId`, and `insert`
- deterministic persistence failures map to:
  - `already_exists`
  - `invalid_reference`
- retryable persistence failures map to:
  - `transient_failure`
  - `unknown_failure`
- the adapter validates:
  - optional referenced `research_hypothesis` existence when `researchHypothesisId` is present

The adapter intentionally does not validate:
- `research_review_packet_id`
- `setup_family_id`
- `setup_revision_id`

Those remain service-owned/query-owned references rather than durable entity FKs in this step.

## Consequences
Positive:
- the review-decision slice now has an explicit adapter boundary before repository/Prisma wiring
- the create-only nature of review decisions stays reflected in the persistence surface
- deterministic failure handling can be tested independently of DB runtime wiring

Tradeoffs:
- this adds another narrow contract layer before the repository implementation lands
- the full repository/Prisma rollout is still incomplete until the next step

## Explicitly postponed
- domain/durable mappers
- adapter-backed relational repository implementation
- concrete Prisma adapter wiring
- shared implemented-product bundle extension through review decisions

## Follow-up
- domain/durable mappers, adapter-backed repository, and concrete Prisma adapter rollout for `research_review_decision` is completed later in ADR-047
