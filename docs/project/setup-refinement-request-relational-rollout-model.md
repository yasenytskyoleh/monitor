# Setup Refinement Request Relational Rollout Model

## Purpose
Capture the executable durable relational rollout for `SetupRefinementRequest` on top of its already-committed contract, schema, and adapter boundary.

This step gives the first later downstream refinement-follow-up entity the same per-entity durable parity already established for the core research chain, `research_feedback_decision`, `research_decision_approval`, `research_review_decision`, `routed_action_execution_envelope`, and `setup_lifecycle_mutation_record`, without yet extending the shared implemented-product bundle and opt-in real-Postgres integration through `setup_refinement_request`.

## Implemented artifact locations
- `packages/domain-model/src/storage/setup-refinement-request-relational-slice.ts`
- `packages/domain-model/src/storage/setup-refinement-request-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260706143000_product_domain_setup_refinement_request_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/setup-refinement-request-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/setup-refinement-request-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/setup-refinement-request-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/setup-refinement-request-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/setup-refinement-request-relational-repositories.ts`
- `packages/domain-model/src/repositories/setup-refinement-request-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/setup-refinement-request-relational-prisma-client.ts`
- `packages/domain-model/test/setup-refinement-request-relational-repository-adapter-contracts.test.ts`
- `packages/domain-model/test/setup-refinement-request-relational-repository-mappers.test.ts`
- `packages/domain-model/test/setup-refinement-request-relational-repositories.test.ts`
- `packages/domain-model/test/setup-refinement-request-relational-prisma-adapter.test.ts`
- `docs/project/setup-refinement-request-relational-adapter-model.md`
- `docs/architecture/adr/ADR-064-setup-refinement-request-relational-adapter-contract.md`
- `docs/architecture/adr/ADR-065-setup-refinement-request-adapter-backed-relational-repositories.md`

## What this step adds
- domain-to-durable hydration/dehydration mappers for `setup_refinement_request`
- an adapter-backed relational repository implementation
- a concrete Prisma adapter with deterministic error mapping for setup, approval, and feedback reference lineage
- slice-level shared repository composition

## What this step proves
- `setup_refinement_request` now has:
  - implemented in-memory persistence
  - a durable relational contract
  - committed Prisma schema/migrations
  - a repository adapter contract
  - domain/durable mappers
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
- the refinement-follow-up slice now reaches the same per-entity durable parity already established for the core research chain, `research_feedback_decision`, `research_decision_approval`, `research_review_decision`, `routed_action_execution_envelope`, and `setup_lifecycle_mutation_record`
- the remaining work is shared-bundle extension and real-database integration coverage, not another speculative per-entity contract pass

## What remains pending
- shared implemented-product relational bundle extension through `setup_refinement_request`
- opt-in real-Postgres integration coverage for the extended shared bundle through `setup_refinement_request`
- later execution/mutation durable slices after `setup_refinement_request`
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
