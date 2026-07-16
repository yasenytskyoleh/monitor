# Implemented Product Setup Definition Revision Composition Model

## Purpose
Capture the extension of the shared Prisma-backed implemented-product repository bundle through `setup_definition_revision`.

This step does not add new business rules. It extends the already-shared persistence boundary so the full implemented product chain can run through one client and one shared repository bundle through setup-definition revisions, while leaving the next downstream activation slice for the next bounded persistence step.

## Implemented artifact locations
- `packages/domain-model/src/repositories/implemented-product-relational-repositories.ts`
- `packages/domain-model/src/repositories/implemented-product-relational-prisma-client.ts`
- `packages/domain-model/test/implemented-product-relational-repositories.test.ts`
- `docs/architecture/adr/ADR-072-implemented-product-setup-definition-revision-composition.md`

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
  - `setup_refinement_request`
  - `setup_definition_revision`
- one shared Prisma-backed bundle factory around a single client and all current implemented adapters through setup-definition revisions

## What this step proves
- the full implemented product chain now persists through one shared product-domain boundary across the currently implemented downstream mutation, refinement, and revision slices
- the revision slice composes cleanly with the earlier shared chain and the refinement-follow-up slice
- the next persistence task can move to the downstream activation slice instead of revisiting shared-composition wiring

## What remains pending
- `setup_revision_activation_record`
- later durable slices for downstream execution/mutation entities after `setup_revision_activation_record`
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
