# ADR-076: Setup Revision Activation Record Relational Adapter Contract

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `setup_revision_activation_record`
- the committed Prisma schema and SQL migration for that activation-audit slice
- and in-memory domain repositories for the activation audit artifact

The next missing layer was the adapter boundary between a future relational repository and physical activation-audit storage.

Without that contract, the later repository and Prisma adapter step would risk:
- leaking activation-lineage reference checks into repository code inconsistently
- changing deterministic failure behavior implicitly
- and adding update-oriented adapter surface even though the activation-audit repository is create-only today

## Decision
Adopt a relational adapter contract for `setup_revision_activation_record`.

Decision rules:
- the adapter remains durable-record-facing
- the current public operations are `load`, `listBySetupFamilyId`, `listByTargetRevisionId`, and `insert`
- deterministic persistence failures map to:
  - `already_exists`
  - `invalid_reference`
- retryable persistence failures map to:
  - `transient_failure`
  - `unknown_failure`
- the adapter validates:
  - referenced target `setup_definition_revision` existence
  - referenced target `setup_definition` existence
  - optional previous `setup_definition_revision` existence
  - optional previous `setup_definition` existence
  - target revision/setup-family consistency
  - target revision/target-setup consistency
  - optional previous revision/setup-family consistency
  - optional previous revision/previous-setup consistency when both are present
  - distinct previous and target lineage ids

The adapter intentionally does not validate:
- target revision activation eligibility
- whether optional previous lineage reflects the actual previously active setup
- activation outcome correctness for the service path taken
- setup-definition status transitions or revision superseding semantics

Those remain service-owned business rules rather than persistence-boundary checks in this step.

## Consequences
Positive:
- the activation-audit slice now has an explicit adapter boundary before repository/Prisma wiring
- the create-only nature of setup-revision activation records stays reflected in the persistence surface
- deterministic failure handling can be tested independently of DB runtime wiring

Tradeoffs:
- this adds another narrow contract layer before the repository implementation lands
- the full repository/Prisma rollout is still incomplete at this contract step

## Explicitly postponed at this contract step
- shared implemented-product bundle extension through `setup_revision_activation_record`
- opt-in real-Postgres integration coverage through `setup_revision_activation_record`

## Follow-up
- the adapter-backed relational repository rollout for `setup_revision_activation_record` is completed in ADR-077
