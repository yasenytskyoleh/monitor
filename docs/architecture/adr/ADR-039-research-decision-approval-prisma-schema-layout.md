# ADR-039: Research Decision Approval Prisma Schema Layout

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `research_decision_approval`
- committed physical schema artifacts through `research_feedback_decision`
- and one shared Prisma-backed repository bundle across the implemented research chain through `research_feedback_decision`

The next missing layer for `research_decision_approval` was a committed physical schema layout that future adapters can target directly.

Without this step, repository/adapter implementation would still be blocked by unresolved decisions about:
- enum families for approval status and approval outcome
- physical foreign-key coverage for the approval artifact
- and DB-enforced invariants for authorized-next-action and reviewer fields

## Decision
Commit the Prisma physical schema and SQL migration for `research_decision_approval`.

The layout uses:
- PostgreSQL under `product_domain`
- Prisma schema artifacts as the canonical physical description
- explicit SQL migration artifacts for the approval slice
- required foreign keys to `research_feedback_decision` and `setup_definition`
- DB-level checks for reviewer identity, authorized-next-action semantics, and approval timestamp consistency

## Consequences
Positive:
- the approval slice now has committed physical storage artifacts
- repository/adapter implementation can target a concrete schema instead of inferred storage
- current approval semantics are enforced consistently at the physical boundary

Tradeoffs:
- physical linkage between `research_feedback_decision` and the same `setup_definition` remains service-owned rather than fully encoded as a compound foreign key
- repository adapters for this entity are still deferred in this step

## Explicitly not included
- repository adapter contracts
- domain/durable mappers
- adapter-backed relational repositories
- concrete Prisma adapter wiring
- shared implemented-product bundle extension through approvals

## Follow-up
- repository/adapter implementation for `research_decision_approval`
- extend the shared implemented-product repository bundle and end-to-end real-Postgres integration path through `research_decision_approval`
