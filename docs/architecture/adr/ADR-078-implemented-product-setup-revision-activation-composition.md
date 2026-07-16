# ADR-078: Implemented Product Setup Revision Activation Composition

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `setup_definition_revision`
- per-entity durable relational parity for `setup_revision_activation_record`

That meant the repo still lacked one shared proof that the full implemented product chain, including the downstream activation-audit entity, could run together through a single Prisma-backed repository bundle.

## Decision
Extend the shared implemented-product repository composition and shared Prisma-backed bundle through `setup_revision_activation_record`.

This includes:
- adding the setup-revision-activation-record adapter into the shared composition
- extending the shared Prisma adapter bundle type
- extending the shared repository bundle type through setup-revision activation records

## Consequences
Positive:
- the full implemented product chain now has one coherent shared persistence bundle through `setup_revision_activation_record`
- shared bundle coverage now reaches the currently implemented downstream mutation, refinement, revision, and activation slices
- the next persistence task can stay focused on real-database integration coverage rather than more composition work

Tradeoffs:
- the end-to-end real-Postgres integration flow still stops at `setup_definition_revision` at this composition step
- later downstream execution/mutation durable slices remain separate from this shared bundle

## Explicitly not included
- setup-revision-activation-chain real-Postgres integration coverage
- later downstream execution/mutation durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- the end-to-end real-database integration flow through `setup_revision_activation_record` is completed later in ADR-079
