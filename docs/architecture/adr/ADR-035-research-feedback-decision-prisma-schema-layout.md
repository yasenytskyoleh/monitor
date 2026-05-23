# ADR-035: Research Feedback Decision Prisma Schema Layout

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `research_feedback_decision`
- committed physical schema artifacts for the current core research chain
- and one shared Prisma-backed repository bundle across the five core-chain entities

The next missing layer for `research_feedback_decision` was a committed physical schema layout that future adapters can target directly.

Without this step, repository/adapter implementation would still be blocked by unresolved decisions about:
- enum families for decision status and recommended action
- reviewer metadata storage shape
- required foreign-key coverage
- and DB-enforced invariants for manual-review decision records

## Decision
Commit the Prisma physical schema and SQL migration for `research_feedback_decision`.

The layout uses:
- PostgreSQL under `product_domain`
- Prisma schema artifacts as the canonical physical description
- explicit SQL migration artifacts for the feedback-decision slice
- required foreign keys to `setup_definition` and `research_hypothesis`
- optional foreign key to `setup_aggregate_result`
- JSONB storage for `reviewer_metadata`
- DB-level checks for current manual-review semantics and review-state metadata consistency

## Consequences
Positive:
- the first downstream review/governance entity now has committed physical storage artifacts
- adapter/repository implementation can target a concrete schema instead of inferred storage
- current manual-review semantics are enforced consistently at the physical boundary

Tradeoffs:
- physical linkage between `setup_aggregate_result` and the same setup/hypothesis remains service-owned rather than fully encoded as compound foreign keys
- repository adapters for this entity were still deferred in this step and were completed later in ADR-036

## Explicitly not included
- repository adapter contracts
- domain/durable mappers
- adapter-backed relational repositories
- concrete Prisma adapter wiring
- approval/review/execution entities beyond `research_feedback_decision`

## Follow-up
- repository/adapter implementation for `research_feedback_decision` is completed in ADR-036
- extend the shared implemented-product repository bundle and end-to-end real-Postgres integration path through `research_feedback_decision`
