# Research Feedback Decision Relational Rollout Model

## Purpose
Capture the executable durable relational rollout for `ResearchFeedbackDecision` on top of its already-committed contract and schema.

This step gives the first downstream review/governance entity the same per-entity durable parity that the core research chain already has, without expanding into approval entities, runtime engines, or UI work.

## Implemented artifact locations
- `packages/domain-model/src/storage/research-feedback-decision-relational-slice.ts`
- `packages/domain-model/src/storage/research-feedback-decision-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260523091500_product_domain_research_feedback_decision_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/research-feedback-decision-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/research-feedback-decision-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/research-feedback-decision-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/research-feedback-decision-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/research-feedback-decision-relational-repositories.ts`
- `packages/domain-model/src/repositories/research-feedback-decision-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/research-feedback-decision-relational-prisma-client.ts`
- `packages/domain-model/test/research-feedback-decision-relational-repository-mappers.test.ts`
- `packages/domain-model/test/research-feedback-decision-relational-repositories.test.ts`
- `packages/domain-model/test/research-feedback-decision-relational-prisma-adapter.test.ts`
- `packages/domain-model/test/research-feedback-decision-relational-repositories.integration.test.ts`

## What this step adds
- a durable adapter contract for `research_feedback_decision`
- a reference-validating in-memory durable adapter harness
- domain-to-durable hydration/dehydration mappers
- an adapter-backed relational repository implementation
- a concrete Prisma adapter with deterministic error mapping for:
  - `setup_definition`
  - `research_hypothesis`
  - optional `setup_aggregate_result`
- slice-level shared repository composition
- opt-in real-Postgres integration coverage for the feedback-decision slice

## What this step proves
- `research_feedback_decision` now has:
  - implemented in-memory persistence
  - a durable relational contract
  - committed Prisma schema/migrations
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
  - opt-in real-database integration coverage
- the first downstream review/governance entity now matches the per-entity durable parity already established for the core research chain
- this step made the later shared-bundle extension through feedback decisions straightforward instead of speculative

## What remains pending
- shared implemented-product bundle extension through `research_feedback_decision` is completed later in `docs/architecture/adr/ADR-037-implemented-product-feedback-decision-composition.md`
- later durable slices for `research_decision_approval` and other review/execution entities
- runtime detection, evaluation, aggregation, and review engines
- exchange ingestion and UI work
