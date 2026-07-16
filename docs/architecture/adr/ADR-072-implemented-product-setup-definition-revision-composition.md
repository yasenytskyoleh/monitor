# ADR-072: Implemented Product Setup Definition Revision Composition

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `setup_refinement_request`
- per-entity durable relational parity for `setup_definition_revision`

That meant the repo still lacked one shared proof that the full implemented product chain, including the downstream revision-tracking entity, could run together through a single Prisma-backed repository bundle.

## Decision
Extend the shared implemented-product repository composition and shared Prisma-backed bundle through `setup_definition_revision`.

This includes:
- adding the setup-definition-revision adapter into the shared composition
- extending the shared Prisma adapter bundle type
- extending the shared repository bundle type through setup-definition revisions

## Consequences
Positive:
- the full implemented product chain now has one coherent shared persistence bundle through `setup_definition_revision`
- shared bundle coverage now reaches the currently implemented downstream mutation, refinement, and revision slices
- the next persistence task can stay focused on real-database integration coverage rather than more composition work

Tradeoffs:
- the end-to-end real-Postgres integration flow still stops at `setup_refinement_request` at this composition step
- later activation and downstream execution/mutation durable slices remain separate from this shared bundle

## Explicitly not included
- setup-definition-revision-chain real-Postgres integration coverage
- later activation and downstream execution/mutation durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- extend the end-to-end real-database integration flow through setup -> candidate -> evaluation -> aggregate -> feedback decision -> approval -> review decision -> routed action execution envelope -> setup lifecycle mutation record -> setup refinement request -> setup definition revision in ADR-073
