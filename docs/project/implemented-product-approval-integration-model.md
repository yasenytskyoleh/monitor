# Implemented Product Approval Integration Model

## Purpose
Capture the extension of the shared real-Postgres integration path through `research_decision_approval`.

This step does not add new product rules. It proves that the already-shared repository bundle and the already-implemented approval slice work together against the committed migrations in one end-to-end integration harness.

## Implemented artifact locations
- `packages/domain-model/test/implemented-product-relational-repositories.integration.test.ts`
- `docs/architecture/adr/ADR-043-implemented-product-approval-integration-coverage.md`

## What this step adds
- one opt-in real-Postgres integration path for:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
  - `research_feedback_decision`
  - `research_decision_approval`
- one real-database failure-path assertion for invalid approval setup linkage

## What this step proves
- the full implemented product chain now has both:
  - one shared Prisma-backed repository bundle
  - one end-to-end real-Postgres integration flow
- approval reference validation behaves consistently against a real database, not only the in-memory harness and fake Prisma clients
- the next persistence task can move to the next downstream durable slice instead of more approval-chain infrastructure work

## What remains pending
- shared implemented-product composition through `research_review_decision` is completed later in `docs/architecture/adr/ADR-048-implemented-product-review-decision-composition.md`
- shared real-Postgres integration coverage through `research_review_decision` is completed later in `docs/architecture/adr/ADR-049-implemented-product-review-decision-integration-coverage.md`
- later durable slices for downstream review/execution entities
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
