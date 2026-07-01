# Implemented Product Review Decision Composition Model

## Purpose
Capture the extension of the shared Prisma-backed implemented-product repository bundle through `research_review_decision`.

This step does not add new business rules. It extends the already-shared persistence boundary so the full implemented product chain can run through one client and one shared repository bundle through review decisions, while leaving the next persistence step focused on the first later review/execution durable slice.

## Implemented artifact locations
- `packages/domain-model/src/repositories/implemented-product-relational-repositories.ts`
- `packages/domain-model/src/repositories/implemented-product-relational-prisma-client.ts`
- `packages/domain-model/test/implemented-product-relational-repositories.test.ts`
- `docs/architecture/adr/ADR-048-implemented-product-review-decision-composition.md`

## What this step adds
- one shared repository composition spanning:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
  - `research_feedback_decision`
  - `research_decision_approval`
  - `research_review_decision`
- one shared Prisma-backed bundle factory around a single client and all current implemented adapters through review decisions

## What this step proves
- the full implemented product chain now persists through one shared product-domain boundary through review decisions
- the downstream review-decision slice composes cleanly with the earlier shared research chain and approval slice
- the next persistence task can stay focused on the first later review/execution durable slice instead of more shared-composition work

## What remains pending
- opt-in real-Postgres integration coverage for setup -> candidate -> evaluation -> aggregate -> feedback decision -> approval -> review decision is completed later in `docs/architecture/adr/ADR-049-implemented-product-review-decision-integration-coverage.md`
- later durable slices for downstream review/execution entities
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
