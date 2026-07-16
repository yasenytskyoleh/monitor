# ADR-066: Implemented Product Setup Refinement Request Composition

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `setup_lifecycle_mutation_record`
- per-entity durable relational parity for `setup_refinement_request`

That meant the repo still lacked one shared proof that the full implemented product chain, including the downstream refinement-follow-up entity, could run together through a single Prisma-backed repository bundle.

## Decision
Extend the shared implemented-product repository composition and shared Prisma-backed bundle through `setup_refinement_request`.

This includes:
- adding the setup-refinement-request adapter into the shared composition
- extending the shared Prisma adapter bundle type
- extending the shared repository bundle type through setup-refinement requests

## Consequences
Positive:
- the full implemented product chain now has one coherent shared persistence bundle through `setup_refinement_request`
- shared bundle coverage now reaches both currently implemented downstream mutation/refinement entities
- the next persistence task can stay focused on real-database integration coverage rather than more composition work

Tradeoffs:
- the end-to-end real-Postgres integration flow still stops at `setup_lifecycle_mutation_record` at this composition step
- later execution/mutation durable slices remain separate from this shared bundle

## Explicitly not included
- setup-refinement-chain real-Postgres integration coverage
- later execution/mutation durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- extend the end-to-end real-database integration flow through setup -> candidate -> evaluation -> aggregate -> feedback decision -> approval -> review decision -> routed action execution envelope -> setup lifecycle mutation record -> setup refinement request in ADR-067
