# Implemented Product Routed Action Execution Envelope Integration Model

## Purpose
Capture the extension of the shared real-Postgres integration path through `routed_action_execution_envelope`.

This step does not add new product rules. It proves that the already-shared repository bundle and the already-implemented execution-envelope slice work together against the committed migrations in one end-to-end integration harness.

## Implemented artifact locations
- `packages/domain-model/test/implemented-product-relational-repositories.integration.test.ts`
- `docs/architecture/adr/ADR-055-implemented-product-routed-action-execution-envelope-integration-coverage.md`

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
  - `routed_action_execution_envelope`
- one real-database failure-path assertion for invalid routed-action review-decision linkage

## What this step proves
- the full implemented product chain now has both:
  - one shared Prisma-backed repository bundle
  - one end-to-end real-Postgres integration flow through routed-action execution envelopes
- routed-action reference validation behaves consistently against a real database, not only the in-memory harness and fake Prisma clients
- the routed-action chain no longer blocks downstream mutation-audit persistence work
- durable relational contract/schema work for `setup_lifecycle_mutation_record` has now also been completed in later follow-up work

## What remains pending
- the domain/durable mappers, adapter-backed relational repository, and Prisma adapter rollout for `setup_lifecycle_mutation_record`
- later execution/mutation durable slices after `setup_lifecycle_mutation_record`
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
