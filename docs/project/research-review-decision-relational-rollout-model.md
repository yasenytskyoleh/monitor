# Research Review Decision Relational Rollout Model

## Purpose
Capture the executable durable relational rollout for `ResearchReviewDecision` on top of its already-committed contract, schema, and adapter boundary.

This step gives the current downstream review entity the same per-entity durable parity already established for the core research chain, `research_feedback_decision`, and `research_decision_approval`, without yet extending the shared implemented-product bundle through review decisions.

## Implemented artifact locations
- `packages/domain-model/src/storage/research-review-decision-relational-slice.ts`
- `packages/domain-model/src/storage/research-review-decision-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260630113000_product_domain_research_review_decision_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/research-review-decision-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/research-review-decision-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/research-review-decision-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/research-review-decision-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/research-review-decision-relational-repositories.ts`
- `packages/domain-model/src/repositories/research-review-decision-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/research-review-decision-relational-prisma-client.ts`
- `packages/domain-model/test/research-review-decision-relational-repository-adapter-contracts.test.ts`
- `packages/domain-model/test/research-review-decision-relational-repository-mappers.test.ts`
- `packages/domain-model/test/research-review-decision-relational-repositories.test.ts`
- `packages/domain-model/test/research-review-decision-relational-prisma-adapter.test.ts`
- `docs/project/research-review-decision-relational-adapter-model.md`
- `docs/architecture/adr/ADR-046-research-review-decision-relational-adapter-contract.md`
- `docs/architecture/adr/ADR-047-research-review-decision-adapter-backed-relational-repositories.md`

## What this step adds
- a durable-record-facing adapter contract for `research_review_decision`
- domain-to-durable hydration/dehydration mappers for `research_review_decision`
- an adapter-backed relational repository implementation
- a concrete Prisma adapter with deterministic error mapping for optional `research_hypothesis` references
- slice-level shared repository composition

## What this step proves
- `research_review_decision` now has:
  - implemented in-memory persistence
  - a durable relational contract
  - committed Prisma schema/migrations
  - a repository adapter contract
  - domain/durable mappers
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
- the review-decision slice now reaches the same per-entity durable parity already established for the core research chain, `research_feedback_decision`, and `research_decision_approval`
- the remaining work is shared-bundle extension and real-database integration coverage, not another speculative per-entity contract pass

## What remains pending
- shared implemented-product bundle extension through `research_review_decision`
- opt-in real-Postgres integration coverage for the extended shared bundle through `research_review_decision`
- later review/execution durable slices
- runtime detection, evaluation, aggregation, and review engines
- exchange ingestion and UI work
