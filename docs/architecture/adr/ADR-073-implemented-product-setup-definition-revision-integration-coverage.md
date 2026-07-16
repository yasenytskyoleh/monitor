# ADR-073: Implemented Product Setup Definition Revision Integration Coverage

## Status
Accepted

## Context
The repo already had:
- one shared Prisma-backed repository bundle through `setup_definition_revision`
- per-entity durable relational parity for `setup_definition_revision`
- opt-in real-Postgres integration coverage through `setup_refinement_request`

That meant the remaining proof gap was narrow: the revision slice was composed into the shared bundle, but the end-to-end real-database integration path still stopped before setup-definition-revision persistence.

## Decision
Extend the shared real-Postgres integration coverage through `setup_definition_revision`.

This includes:
- adding the setup-definition-revision migration into the shared integration harness
- persisting setup-definition revisions through the shared repository bundle against real Postgres
- asserting one invalid setup-definition-revision refinement linkage path against the same real-database harness

## Consequences
Positive:
- the full implemented product chain now has one verified end-to-end real-database persistence flow through `setup_definition_revision`
- setup-definition-revision reference validation is now proven across:
  - in-memory adapters
  - fake Prisma adapter tests
  - real Postgres integration coverage
- the next downstream persistence work can move to `setup_revision_activation_record` without revisiting the revision shared persistence boundary

Tradeoffs:
- later activation and downstream execution/mutation durable slices still remain pending after this step
- the setup-definition-revision integration harness is still opt-in and depends on `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL`

## Explicitly not included
- later activation and downstream execution/mutation durable slices
- runtime review/execution engines
- exchange ingestion
- UI work

## Follow-up
- the durable relational contract for `setup_revision_activation_record` is completed later in ADR-074
- the Prisma physical schema and SQL migration for `setup_revision_activation_record` are completed later in ADR-075
- the relational adapter contract for `setup_revision_activation_record` is completed later in ADR-076
- the adapter-backed relational repository rollout for `setup_revision_activation_record` is completed later in ADR-077
- the shared implemented-product composition through `setup_revision_activation_record` is completed later in ADR-078
- the next recommended step is opt-in real-database integration through `setup_revision_activation_record`
