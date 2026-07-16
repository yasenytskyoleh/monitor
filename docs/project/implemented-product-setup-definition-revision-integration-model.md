# Implemented Product Setup Definition Revision Integration Model

## Purpose
Capture the extension of the shared real-Postgres integration path through `setup_definition_revision`.

This step does not add new product rules. It proves that the already-shared repository bundle and the already-implemented revision slice work together against the committed migrations in one end-to-end integration harness.

## Implemented artifact locations
- `packages/domain-model/test/implemented-product-relational-repositories.integration.test.ts`
- `docs/architecture/adr/ADR-073-implemented-product-setup-definition-revision-integration-coverage.md`

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
  - `setup_refinement_request`
  - `setup_definition_revision`
- one real-database failure-path assertion for invalid setup-definition-revision refinement linkage

## What this step proves
- the full implemented product chain now has both:
  - one shared Prisma-backed repository bundle
  - one end-to-end real-Postgres integration flow through `setup_definition_revision`
- setup-definition-revision lineage validation behaves consistently against a real database, not only the in-memory harness and fake Prisma clients
- the next downstream persistence work can move to `setup_revision_activation_record` without revisiting the revision shared-bundle boundary

## What remains pending
- shared implemented-product composition through `setup_revision_activation_record` is completed later in `docs/project/implemented-product-setup-revision-activation-composition-model.md`
- opt-in real-database integration coverage through `setup_revision_activation_record`
- later durable slices for downstream execution/mutation entities after `setup_revision_activation_record`
- runtime detection, evaluation, aggregation, review, and execution engines
- exchange ingestion and UI work
