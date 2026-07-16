# Setup Revision Activation Relational Rollout Model

## Purpose
Capture the executable durable relational rollout for `SetupRevisionActivationRecord` on top of its already-committed contract, schema, and adapter boundary.

This step gives the downstream activation-audit entity the same per-entity durable parity already established for the core research chain, `research_feedback_decision`, `research_decision_approval`, `research_review_decision`, `routed_action_execution_envelope`, `setup_lifecycle_mutation_record`, `setup_refinement_request`, and `setup_definition_revision`, before the later shared implemented-product bundle extension and opt-in real-Postgres integration work for `setup_revision_activation_record`.

## Implemented artifact locations
- `packages/domain-model/src/storage/setup-revision-activation-record-relational-slice.ts`
- `packages/domain-model/src/storage/setup-revision-activation-record-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260711103000_product_domain_setup_revision_activation_record_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-repositories.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/setup-revision-activation-record-relational-prisma-client.ts`
- `packages/domain-model/test/setup-revision-activation-record-relational-repository-adapter-contracts.test.ts`
- `packages/domain-model/test/setup-revision-activation-record-relational-repository-mappers.test.ts`
- `packages/domain-model/test/setup-revision-activation-record-relational-repositories.test.ts`
- `packages/domain-model/test/setup-revision-activation-record-relational-prisma-adapter.test.ts`
- `docs/project/setup-revision-activation-relational-persistence-model.md`
- `docs/project/setup-revision-activation-relational-adapter-model.md`
- `docs/project/setup-revision-activation-relational-rollout-model.md`
- `docs/architecture/adr/ADR-076-setup-revision-activation-record-relational-adapter-contract.md`
- `docs/architecture/adr/ADR-077-setup-revision-activation-record-adapter-backed-relational-repositories.md`

## What this step adds
- domain-to-durable hydration/dehydration mappers for `setup_revision_activation_record`
- an adapter-backed relational repository implementation for the create-only activation-audit slice
- a concrete Prisma adapter with deterministic error mapping and persistence-boundary lineage validation
- slice-level shared repository composition

## What this step proves
- `setup_revision_activation_record` now has:
  - implemented in-memory persistence
  - a durable relational contract
  - committed Prisma schema/migrations
  - a repository adapter contract
  - domain/durable mappers
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
- the activation-audit slice now reaches the same per-entity durable parity already established for the core research chain and later downstream governance/execution slices through `setup_definition_revision`
- the remaining work after this step is shared-bundle extension and real-database integration through `setup_revision_activation_record`, not another speculative per-entity repository pass

## What remains pending
- shared implemented-product relational bundle extension through `setup_revision_activation_record` is completed later in `docs/project/implemented-product-setup-revision-activation-composition-model.md`
- opt-in real-Postgres integration coverage for the extended shared bundle through `setup_revision_activation_record`
- later downstream execution/mutation durable slices after `setup_revision_activation_record`
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
