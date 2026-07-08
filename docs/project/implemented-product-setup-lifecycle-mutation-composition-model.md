# Implemented Product Setup Lifecycle Mutation Composition Model

## Purpose
Capture the extension of the shared Prisma-backed implemented-product repository bundle through `setup_lifecycle_mutation_record`.

This step does not add new business rules. It extends the already-shared persistence boundary so the full implemented product chain can run through one client and one shared repository bundle through setup-lifecycle mutation records, while leaving real-Postgres integration extension for the next step in the same downstream slice.

## Implemented artifact locations
- `packages/domain-model/src/repositories/implemented-product-relational-repositories.ts`
- `packages/domain-model/src/repositories/implemented-product-relational-prisma-client.ts`
- `packages/domain-model/test/implemented-product-relational-repositories.test.ts`
- `docs/architecture/adr/ADR-060-implemented-product-setup-lifecycle-mutation-composition.md`

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
  - `routed_action_execution_envelope`
  - `setup_lifecycle_mutation_record`
- one shared Prisma-backed bundle factory around a single client and all current implemented adapters through setup-lifecycle mutation records

## What this step proves
- the full implemented product chain now persists through one shared product-domain boundary through setup-lifecycle mutation records
- the downstream mutation-audit slice composes cleanly with the earlier shared chain and the routed-action slice
- the next persistence task can stay narrow and move to real-database integration coverage instead of more shared-composition work

## What remains pending
- opt-in real-Postgres integration coverage for setup -> candidate -> evaluation -> aggregate -> feedback decision -> approval -> review decision -> routed action execution envelope -> setup lifecycle mutation record is completed later in `docs/project/implemented-product-setup-lifecycle-mutation-integration-model.md`
- later durable slices for downstream execution/mutation entities after `setup_lifecycle_mutation_record`
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
