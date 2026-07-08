# Implemented Product Review Decision Integration Model

## Purpose
Capture the extension of the shared real-Postgres integration path through `research_review_decision`.

This step does not add new product rules. It proves that the already-shared repository bundle and the already-implemented review-decision slice work together against the committed migrations in one end-to-end integration harness.

## Implemented artifact locations
- `packages/domain-model/test/implemented-product-relational-repositories.integration.test.ts`
- `docs/architecture/adr/ADR-049-implemented-product-review-decision-integration-coverage.md`

## What this step adds
- one opt-in real-Postgres integration path for:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
  - `research_feedback_decision`
  - `research_decision_approval`
  - `research_review_decision`
- one real-database failure-path assertion for invalid review-decision hypothesis linkage

## What this step proves
- the full implemented product chain now has both:
  - one shared Prisma-backed repository bundle
  - one end-to-end real-Postgres integration flow
- review-decision reference validation behaves consistently against a real database, not only the in-memory harness and fake Prisma clients
- the next persistence task moved into the routed-action execution-envelope slice instead of more review-decision-chain infrastructure work

## What remains pending
- the durable relational contract and physical Prisma schema for `routed_action_execution_envelope` are completed later in `docs/project/routed-action-execution-envelope-relational-persistence-model.md`
- the repository adapter contract for `routed_action_execution_envelope` is completed later in `docs/project/routed-action-execution-envelope-relational-adapter-model.md`
- the adapter-backed relational repository and concrete Prisma adapter for `routed_action_execution_envelope` are completed later in `docs/project/routed-action-execution-envelope-relational-rollout-model.md`
- shared implemented-product relational bundle extension through `routed_action_execution_envelope` is completed later in `docs/project/implemented-product-routed-action-execution-envelope-composition-model.md`
- opt-in real-Postgres integration coverage through `routed_action_execution_envelope` is completed later in `docs/project/implemented-product-routed-action-execution-envelope-integration-model.md`
- later durable slices for downstream review/execution entities
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
