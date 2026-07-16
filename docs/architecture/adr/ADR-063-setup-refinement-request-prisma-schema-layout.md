# ADR-063: Setup Refinement Request Prisma Schema Layout

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `setup_refinement_request`
- committed physical schema artifacts through `setup_lifecycle_mutation_record`
- one shared Prisma-backed repository bundle plus one real-Postgres integration path through `setup_lifecycle_mutation_record`

The next missing layer for `setup_refinement_request` was a committed physical schema layout that future adapters can target directly.

Without this step, repository adapter work for the refinement-follow-up slice would still be blocked by unresolved decisions about:
- whether setup, approval, and feedback-decision lineage should all be enforced as real physical FKs
- how refinement-request audit timestamps should stay consistent at the DB boundary
- how optional reviewer/owner assignments should stay normalized without relying on adapter convention alone

## Decision
Commit the Prisma physical schema and SQL migration for `setup_refinement_request`.

The layout uses:
- PostgreSQL under `product_domain`
- Prisma schema artifacts as the canonical physical description
- explicit SQL migration artifacts for the refinement-follow-up slice
- real FKs to `setup_definition`, `research_decision_approval`, and `research_feedback_decision`
- DB-level checks for required request fields, optional assignment normalization, and request timestamp consistency

## Consequences
Positive:
- the refinement-follow-up slice now has committed physical storage artifacts
- adapter/repository implementation can target a concrete schema instead of inferred storage
- current request-audit semantics are enforced consistently at the physical boundary

Tradeoffs:
- approval/setup/feedback cross-link consistency remains service-owned rather than encoded as compound foreign keys
- approval outcome and authorized-next-action validation remain service-owned
- executable repository wiring for this entity is still deferred in this step

## Explicitly not included
- domain/durable mappers
- adapter-backed relational repositories
- concrete Prisma adapter wiring
- shared implemented-product bundle or real-database integration extension through `setup_refinement_request`

## Follow-up
- the adapter-backed relational repository and concrete Prisma adapter for `setup_refinement_request` are completed in ADR-065
