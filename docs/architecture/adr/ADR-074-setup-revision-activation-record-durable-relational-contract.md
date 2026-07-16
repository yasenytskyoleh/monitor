# ADR-074: Setup Revision Activation Record Durable Relational Contract

## Status
Accepted

## Context
The repo already has:
- one shared Prisma-backed repository bundle through `setup_definition_revision`
- one shared real-Postgres integration flow through `setup_definition_revision`
- `SetupRevisionActivationRecord` in the domain model
- implemented in-memory persistence and a service-owned write path for `SetupRevisionActivationRecord`

The next downstream service-owned persistence gap is `setup_revision_activation_record`.

That entity already exists and participates in the explicit revision-activation flow, but it did not yet have an explicit durable relational contract. Without that contract, physical schema work for the activation-audit slice would start from storage guesses instead of a defined boundary.

## Decision
Add a logical durable relational contract for `setup_revision_activation_record`.

The contract includes:
- one durable record type
- explicit setup-family, target-revision, and target-setup references
- optional previous-revision and previous-setup lineage fields
- explicit activation actor and activation timestamp fields
- persisted activation outcome semantics limited to successful audit outcomes
- nullable `rationale`
- standard product-domain metadata and optimistic version semantics

## Consequences
Positive:
- the first downstream activation-audit slice now has an explicit logical storage contract
- physical schema work can stay narrow and deterministic
- the repo preserves the pattern of contract first, schema second, adapters third

Tradeoffs:
- this step does not yet add Prisma schema or SQL migration artifacts
- activation-family/linkage consistency remains service-owned in this contract step
- later activation-slice adapter and integration work remains outside durable relational coverage

## Explicitly not included
- Prisma schema or migration changes
- repository adapter or mapper implementations
- concrete relational repositories or Prisma adapters
- shared implemented-product bundle or integration extension through `setup_revision_activation_record`
- runtime execution engines
- UI work

## Follow-up
- the Prisma physical schema and SQL migration for `setup_revision_activation_record` are completed in ADR-075
- the relational adapter contract for `setup_revision_activation_record` is completed in ADR-076
- the adapter-backed relational repository rollout for `setup_revision_activation_record` is completed in ADR-077
