# ADR-070: Setup Definition Revision Relational Adapter Contract

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `setup_definition_revision`
- the committed Prisma schema and SQL migration for that revision slice
- and an in-memory domain repository for setup-definition revisions

The next missing layer was the adapter boundary between a future relational repository and physical revision storage.

Without that contract, the later repository and Prisma adapter step would risk:
- leaking revision-lineage checks into repository code inconsistently
- changing deterministic failure behavior implicitly
- and underspecifying the load surface for family-history queries versus setup-definition lookups

## Decision
Adopt a relational adapter contract for `setup_definition_revision`.

Decision rules:
- the adapter remains durable-record-facing
- the public operations are `load`, `loadBySetupDefinitionId`, `loadLatestBySetupFamilyId`, `listBySetupFamilyId`, `insert`, and `update`
- deterministic persistence failures map to:
  - `already_exists`
  - `not_found`
  - `version_mismatch`
  - `invalid_reference`
- retryable persistence failures map to:
  - `transient_failure`
  - `unknown_failure`
- the adapter validates:
  - referenced new setup-definition existence
  - referenced previous setup-definition existence when present
  - referenced source setup-refinement-request existence
  - optional approval and feedback existence
  - refinement-request linkage to the previous setup when present
  - optional approval/feedback lineage against the refinement request
  - approval/setup, approval/feedback, and feedback/setup consistency

The adapter intentionally does not validate:
- revision-status transition legality
- setup-family/version sequencing business rules
- approval outcome authorization
- later activation workflow legality

Those remain service-owned business rules rather than persistence-boundary reference checks in this step.

## Consequences
Positive:
- the revision slice now has an explicit adapter boundary before repository/Prisma wiring
- family-history read requirements are reflected directly in the persistence surface
- deterministic failure handling can be tested independently of DB runtime wiring

Tradeoffs:
- this adds another narrow contract layer before the repository implementation lands
- the shared-bundle and real-database integration rollout still remain after the repository implementation step

## Explicitly postponed at this contract step
- shared implemented-product bundle extension through `setup_definition_revision`
- opt-in real-Postgres integration coverage through `setup_definition_revision`

## Follow-up
- the adapter-backed relational repository rollout for `setup_definition_revision` is completed later in ADR-071
- shared implemented-product composition through `setup_definition_revision` is completed later in ADR-072
- opt-in real-database integration through `setup_definition_revision` is completed later in ADR-073
