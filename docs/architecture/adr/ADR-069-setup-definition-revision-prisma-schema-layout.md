# ADR-069: Setup Definition Revision Prisma Schema Layout

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `setup_definition_revision`
- committed physical schema artifacts through `setup_refinement_request`
- one shared Prisma-backed repository bundle plus one real-Postgres integration path through `setup_refinement_request`

The next missing layer for `setup_definition_revision` was a committed physical schema layout that future adapters can target directly.

Without this step, repository adapter work for the revision slice would still be blocked by unresolved decisions about:
- how setup-family/version uniqueness should be enforced physically
- whether previous-setup and source-refinement lineage should be real FKs
- how optional approval/feedback lineage should stay normalized without overconstraining future revision paths

## Decision
Commit the Prisma physical schema and SQL migration for `setup_definition_revision`.

The layout uses:
- PostgreSQL under `product_domain`
- Prisma schema artifacts as the canonical physical description
- explicit SQL migration artifacts for the revision slice
- real FKs to `setup_definition` and `setup_refinement_request`
- nullable FKs to approval/feedback lineage
- DB-level uniqueness for `setupDefinitionId` and (`setupFamilyId`, `setupVersionNumber`)

## Consequences
Positive:
- the revision slice now has committed physical storage artifacts
- adapter/repository implementation can target a concrete schema instead of inferred storage
- setup-family/version uniqueness is enforced consistently at the physical boundary

Tradeoffs:
- refinement-request/setup linkage and revision-chain continuity remain service-owned rather than encoded as compound foreign keys
- executable repository wiring for this entity is still deferred in this step
- shared bundle/integration coverage still ends at `setup_refinement_request`

## Explicitly not included
- repository adapter contracts
- domain/durable mappers
- adapter-backed relational repositories
- concrete Prisma adapter wiring
- shared implemented-product bundle or real-database integration extension through `setup_definition_revision`

## Follow-up
- the revision-slice adapter contract is completed in ADR-070
- the revision-slice repository rollout is completed in ADR-071
- shared implemented-product composition through `setup_definition_revision` is completed in ADR-072
- opt-in real-database integration through `setup_definition_revision` is completed in ADR-073
