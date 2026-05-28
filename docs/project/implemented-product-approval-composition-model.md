# Implemented Product Approval Composition Model

## Purpose
Capture the extension of the shared Prisma-backed implemented-product repository bundle through `research_decision_approval`.

This step does not add new business rules. It extends the already-shared persistence boundary so the full implemented product chain can run through one client and one shared repository bundle, while leaving real-Postgres integration extension for the next step.

## Implemented artifact locations
- `packages/domain-model/src/repositories/implemented-product-relational-repositories.ts`
- `packages/domain-model/src/repositories/implemented-product-relational-prisma-client.ts`
- `packages/domain-model/test/implemented-product-relational-repositories.test.ts`
- `docs/architecture/adr/ADR-042-implemented-product-approval-composition.md`

## What this step adds
- one shared repository composition spanning:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
  - `research_feedback_decision`
  - `research_decision_approval`
- one shared Prisma-backed bundle factory around a single client and all current implemented adapters through approvals

## What this step proves
- the full implemented product chain now persists through one shared product-domain boundary
- the downstream approval slice composes cleanly with the earlier shared research chain and feedback-decision slice
- the next persistence task can stay narrow and move to real-database integration coverage instead of more shared-composition work

## What remains pending
- opt-in real-Postgres integration coverage for setup -> candidate -> evaluation -> aggregate -> feedback decision -> approval
- later durable slices for other review/execution entities
- runtime detection, evaluation, aggregation, and review engines
- exchange ingestion and UI work
