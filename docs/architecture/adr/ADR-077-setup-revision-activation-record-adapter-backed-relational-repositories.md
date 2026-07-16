# ADR-077: Setup Revision Activation Record Adapter-Backed Relational Repositories

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `setup_revision_activation_record`
- the committed Prisma schema and SQL migration for that activation-audit slice
- the relational adapter contract for `setup_revision_activation_record`
- one shared Prisma-backed repository bundle plus one opt-in real-Postgres integration path through `setup_definition_revision`

What was still missing for `setup_revision_activation_record` was the executable repository layer:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared composition

Without that layer, the downstream activation-audit slice still lagged behind the rest of the implemented product chain in persistence-boundary quality and enforcement.

## Decision
Implement the adapter-backed relational repository rollout for `setup_revision_activation_record` now.

This includes:
- domain/durable mappers
- adapter-backed relational repository
- concrete Prisma adapter
- slice-level shared repository composition
- explicit persistence-boundary validation for target and optional previous revision/setup lineage

## Consequences
Positive:
- `setup_revision_activation_record` now reaches the same per-entity durable parity as the core research chain and later downstream governance/execution slices through `setup_definition_revision`
- required activation-lineage validation is enforced consistently across the in-memory harness and the Prisma-backed adapter
- the next persistence task can move to shared-bundle extension and real-database integration instead of another per-entity repository pass

Tradeoffs:
- the shared implemented-product Prisma bundle still stops at `setup_definition_revision`
- opt-in real-Postgres integration coverage does not yet include the activation-audit slice

## Explicitly not included
- extending the shared implemented-product bundle through `setup_revision_activation_record`
- extending opt-in real-Postgres integration coverage through `setup_revision_activation_record`
- later downstream execution/mutation durable slices after `setup_revision_activation_record`
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- shared implemented-product composition through `setup_revision_activation_record` is completed later in ADR-078
- opt-in real-database integration through `setup_revision_activation_record` follows after shared composition
