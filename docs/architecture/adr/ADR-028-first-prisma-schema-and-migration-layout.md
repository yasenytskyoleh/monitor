# ADR-028: First Prisma Schema and Migration Layout

## Status
Accepted

## Context
The repo already had:
- implemented in-memory persistence for the initial product slice,
- a first durable relational record contract,
- and a first relational adapter rollout design.

The next missing layer was a committed physical schema layout that future relational adapters can target directly.

Without this step, adapter implementation would still be blocked by unresolved decisions about:
- table boundaries,
- normalized hypothesis/setup linkage,
- metadata column shape,
- and minimal physical constraints for optimistic concurrency.

## Decision
Commit the first physical Prisma schema and initial SQL migration for:
- `setup_definition`
- `research_hypothesis`
- `research_hypothesis_setup_definition_link`

under `packages/domain-model/prisma/*`.

The physical layout uses:
- PostgreSQL as the target database direction
- Prisma schema artifacts as the canonical schema description
- explicit SQL migration artifacts for `product_domain.relational.v1`
- normalized link storage for hypothesis-to-setup relationships
- explicit metadata columns instead of opaque JSON blobs for first-slice metadata

## Consequences
Positive:
- future relational adapters now have a concrete table contract
- optimistic concurrency remains explicit at the `version` column level
- first-slice link replacement can be implemented transactionally against a known join table
- schema and migration review can happen before runtime DB wiring

Tradeoffs:
- Prisma tooling is still not wired into package scripts yet
- this introduces static physical-schema artifacts before executable DB runtime integration
- later schema expansion for `signal_candidate`, `evaluation_result`, and `setup_aggregate_result` must preserve the same contract discipline

## Explicitly not included
- Prisma client installation or generation
- runtime DB connection wiring
- relational adapter implementation
- migration execution automation
- expansion beyond the first durable slice

## Follow-up
- wire Prisma tooling and implement relational repositories/adapters for the first durable slice against the committed schema
