# Implemented Product Setup Lifecycle Mutation Integration Model

## Purpose
Capture the extension of the shared real-Postgres integration path through `setup_lifecycle_mutation_record`.

This step does not add new product rules. It proves that the already-shared repository bundle and the already-implemented mutation-audit slice work together against the committed migrations in one end-to-end integration harness.

## Implemented artifact locations
- `packages/domain-model/test/implemented-product-relational-repositories.integration.test.ts`
- `docs/architecture/adr/ADR-061-implemented-product-setup-lifecycle-mutation-integration-coverage.md`

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
  - `setup_lifecycle_mutation_record`
- one real-database failure-path assertion for invalid setup-lifecycle approval linkage

## What this step proves
- the full implemented product chain now has both:
  - one shared Prisma-backed repository bundle
  - one end-to-end real-Postgres integration flow through setup-lifecycle mutation records
- setup-lifecycle reference validation behaves consistently against a real database, not only the in-memory harness and fake Prisma clients
- the full implemented product chain no longer blocks on shared persistence infrastructure, so the remaining work moves to later downstream execution/mutation durable slices

## What remains pending
- later durable slices for downstream execution/mutation entities after `setup_lifecycle_mutation_record`
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
