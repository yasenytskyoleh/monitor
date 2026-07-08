# ADR-057: Setup Lifecycle Mutation Record Prisma Schema Layout

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `setup_lifecycle_mutation_record`
- committed physical schema artifacts through `routed_action_execution_envelope`
- one shared Prisma-backed repository bundle plus one real-Postgres integration path through `routed_action_execution_envelope`

The next missing layer for `setup_lifecycle_mutation_record` was a committed physical schema layout that future adapters can target directly.

Without this step, adapter/repository implementation would still be blocked by unresolved decisions about:
- whether setup, approval, and feedback-decision lineage should all be enforced as real physical FKs
- how approved action and resulting setup status should stay aligned at the DB boundary
- how mutation audit timestamps should stay consistent without relying on adapter convention alone

## Decision
Commit the Prisma physical schema and SQL migration for `setup_lifecycle_mutation_record`.

The layout uses:
- PostgreSQL under `product_domain`
- Prisma schema artifacts as the canonical physical description
- explicit SQL migration artifacts for the mutation-audit slice
- real FKs to `setup_definition`, `research_decision_approval`, and `research_feedback_decision`
- DB-level checks for approved-action/new-status alignment, required mutation-audit fields, and timestamp consistency

## Consequences
Positive:
- the mutation-audit slice now has committed physical storage artifacts
- adapter/repository implementation can target a concrete schema instead of inferred storage
- current approved-action and mutation-timestamp semantics are enforced consistently at the physical boundary

Tradeoffs:
- approval/setup/feedback cross-link consistency remains service-owned rather than encoded as compound foreign keys
- lifecycle-transition legality and approval/action equivalence against the referenced approval record remain service-owned
- repository adapters for this entity are still deferred in this step

## Explicitly not included
- repository adapter contracts
- domain/durable mappers
- adapter-backed relational repositories
- concrete Prisma adapter wiring
- shared implemented-product bundle extension beyond `routed_action_execution_envelope`

## Follow-up
- the repository adapter contract for `setup_lifecycle_mutation_record` is the next step
