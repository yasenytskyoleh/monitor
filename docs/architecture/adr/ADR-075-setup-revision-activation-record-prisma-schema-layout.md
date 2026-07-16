# ADR-075: Setup Revision Activation Record Prisma Schema Layout

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `setup_revision_activation_record`
- committed physical schema artifacts through `setup_definition_revision`
- one shared Prisma-backed repository bundle plus one real-Postgres integration path through `setup_definition_revision`

The next missing layer for `setup_revision_activation_record` was a committed physical schema layout that future adapters can target directly.

Without this step, repository adapter work for the activation-audit slice would still be blocked by unresolved decisions about:
- how target and previous revision/setup lineage should be enforced physically
- whether activation outcomes should stay limited to persisted success-path audit variants
- how setup-family runtime-resolution queries should be supported without depending on later repository interpretation

## Decision
Commit the Prisma physical schema and SQL migration for `setup_revision_activation_record`.

The layout uses:
- PostgreSQL under `product_domain`
- Prisma schema artifacts as the canonical physical description
- explicit SQL migration artifacts for the activation-audit slice
- real FKs to target revision and target setup-definition records
- nullable FKs to previous revision and previous setup-definition lineage
- indexed setup-family/time and target-revision lookups for runtime resolution and audit reads

## Consequences
Positive:
- the activation-audit slice now has committed physical storage artifacts
- adapter/repository implementation can target a concrete schema instead of inferred storage
- activation outcome and lineage shape are enforced consistently at the physical boundary

Tradeoffs:
- target-family consistency and activation-path correctness remain service-owned rather than encoded as compound relational constraints
- executable repository wiring for this entity is still deferred in this step
- shared bundle/integration coverage still ends at `setup_definition_revision`

## Explicitly not included
- repository adapter contracts
- shared implemented-product bundle or real-database integration extension through `setup_revision_activation_record`

## Follow-up
- the relational adapter contract for `setup_revision_activation_record` is completed in ADR-076
- the adapter-backed relational repository rollout for `setup_revision_activation_record` is completed in ADR-077
