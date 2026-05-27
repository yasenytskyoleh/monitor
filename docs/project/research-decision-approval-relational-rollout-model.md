# Research Decision Approval Relational Rollout Model

## Purpose
Capture the executable durable relational rollout for `ResearchDecisionApproval` on top of its already-committed contract, schema, and adapter boundary.

This step gives the first downstream approval entity the same per-entity durable parity already established for the core research chain and for `research_feedback_decision`, without yet extending the shared implemented-product bundle through approvals.

## Implemented artifact locations
- `packages/domain-model/src/storage/research-decision-approval-relational-slice.ts`
- `packages/domain-model/src/storage/research-decision-approval-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260527103000_product_domain_research_decision_approval_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/research-decision-approval-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-repositories.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-prisma-client.ts`
- `packages/domain-model/test/research-decision-approval-relational-repository-adapter-contracts.test.ts`
- `packages/domain-model/test/research-decision-approval-relational-repository-mappers.test.ts`
- `packages/domain-model/test/research-decision-approval-relational-repositories.test.ts`
- `packages/domain-model/test/research-decision-approval-relational-prisma-adapter.test.ts`
- `docs/architecture/adr/ADR-041-research-decision-approval-adapter-backed-relational-repositories.md`

## What this step adds
- domain-to-durable hydration/dehydration mappers for `research_decision_approval`
- an adapter-backed relational repository implementation
- a concrete Prisma adapter with deterministic error mapping for:
  - `research_feedback_decision`
  - `setup_definition`
- slice-level shared repository composition
- repository-level enforcement that approval `setup_definition_id` must agree with the referenced feedback decision

## What this step proves
- `research_decision_approval` now has:
  - implemented in-memory persistence
  - a durable relational contract
  - committed Prisma schema/migrations
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
- the first downstream approval entity now matches the per-entity durable parity already established for the core research chain and for `research_feedback_decision`
- the remaining approval-persistence work is now shared-bundle composition and real-database integration, not another speculative per-entity design pass

## What remains pending
- extend the shared implemented-product bundle through `research_decision_approval`
- add opt-in real-Postgres integration coverage for the approval slice and extended shared bundle
- later review/execution durable slices
- runtime detection, evaluation, aggregation, and review engines
- exchange ingestion and UI work
