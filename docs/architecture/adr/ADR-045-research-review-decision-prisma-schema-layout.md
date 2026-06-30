# ADR-045: Research Review Decision Prisma Schema Layout

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `research_review_decision`
- committed physical schema artifacts through `research_decision_approval`
- and one shared Prisma-backed repository bundle plus one real-Postgres integration path through `research_decision_approval`

The next missing layer for `research_review_decision` was a committed physical schema layout that future adapters can target directly.

Without this step, adapter/repository implementation would still be blocked by unresolved decisions about:
- enum families for review decision status, outcome, and authorized-next-action
- whether the hypothesis reference should be a real physical FK
- and DB-enforced invariants for review packet identity, reviewer identity, and action semantics

## Decision
Commit the Prisma physical schema and SQL migration for `research_review_decision`.

The layout uses:
- PostgreSQL under `product_domain`
- Prisma schema artifacts as the canonical physical description
- explicit SQL migration artifacts for the review-decision slice
- an optional FK to `research_hypothesis`
- DB-level checks for packet/setup-family identity, authorized-next-action semantics, and review timestamp consistency

## Consequences
Positive:
- the review-decision slice now has committed physical storage artifacts
- adapter/repository implementation can target a concrete schema instead of inferred storage
- current review-decision semantics are enforced consistently at the physical boundary

Tradeoffs:
- `research_review_packet_id`, `setup_family_id`, and `setup_revision_id` remain service-owned references rather than relational FKs
- repository adapters for this entity are still deferred in this step

## Explicitly not included
- repository adapter contracts
- domain/durable mappers
- adapter-backed relational repositories
- concrete Prisma adapter wiring
- shared implemented-product bundle extension through review decisions

## Follow-up
- add the repository adapter contract for `research_review_decision`
- implement the repository/Prisma adapter rollout for `research_review_decision`
