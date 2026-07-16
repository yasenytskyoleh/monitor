# Setup Definition Revision Relational Rollout Model

## Purpose
Capture the executable durable relational rollout for `SetupDefinitionRevision` on top of its already-committed contract, schema, and adapter boundary.

This step gives the first revision-tracking entity the same per-entity durable parity already established for the core research chain, `research_feedback_decision`, `research_decision_approval`, `research_review_decision`, `routed_action_execution_envelope`, `setup_lifecycle_mutation_record`, and `setup_refinement_request`, without yet extending the shared implemented-product bundle and opt-in real-Postgres integration through `setup_definition_revision`.

## Implemented artifact locations
- `packages/domain-model/src/storage/setup-definition-revision-relational-slice.ts`
- `packages/domain-model/src/storage/setup-definition-revision-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260708101500_product_domain_setup_definition_revision_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/setup-definition-revision-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/setup-definition-revision-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/setup-definition-revision-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/setup-definition-revision-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/setup-definition-revision-relational-repositories.ts`
- `packages/domain-model/src/repositories/setup-definition-revision-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/setup-definition-revision-relational-prisma-client.ts`
- `packages/domain-model/test/setup-definition-revision-relational-repository-adapter-contracts.test.ts`
- `packages/domain-model/test/setup-definition-revision-relational-repository-mappers.test.ts`
- `packages/domain-model/test/setup-definition-revision-relational-repositories.test.ts`
- `packages/domain-model/test/setup-definition-revision-relational-prisma-adapter.test.ts`
- `docs/project/setup-definition-revision-relational-persistence-model.md`
- `docs/project/setup-definition-revision-relational-adapter-model.md`
- `docs/project/setup-definition-revision-relational-rollout-model.md`
- `docs/architecture/adr/ADR-070-setup-definition-revision-relational-adapter-contract.md`
- `docs/architecture/adr/ADR-071-setup-definition-revision-adapter-backed-relational-repositories.md`

## What this step adds
- domain-to-durable hydration/dehydration mappers for `setup_definition_revision`
- an adapter-backed relational repository implementation with optimistic status updates
- a concrete Prisma adapter with deterministic error mapping for setup, refinement-request, approval, and feedback lineage checks
- slice-level shared repository composition

## What this step proves
- `setup_definition_revision` now has:
  - implemented in-memory persistence
  - a durable relational contract
  - committed Prisma schema/migrations
  - a repository adapter contract
  - domain/durable mappers
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
- the revision slice now reaches the same per-entity durable parity already established for the core research chain and later downstream governance/execution slices through `setup_refinement_request`
- the remaining work after this step was shared-bundle extension and real-database integration coverage, not another speculative per-entity repository pass

## What remains pending
- shared implemented-product relational bundle extension through `setup_definition_revision`, completed later in `docs/project/implemented-product-setup-definition-revision-composition-model.md`
- opt-in real-Postgres integration coverage for the extended shared bundle through `setup_definition_revision`, completed later in `docs/project/implemented-product-setup-definition-revision-integration-model.md`
- later downstream `setup_revision_activation_record` adapter/repository/shared-bundle/integration rollout, with durable contract/schema completed later in `docs/project/setup-revision-activation-relational-persistence-model.md`
- later execution/mutation durable slices after `setup_revision_activation_record`
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
