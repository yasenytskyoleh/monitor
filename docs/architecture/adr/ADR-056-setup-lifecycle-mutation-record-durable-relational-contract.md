# ADR-056: Setup Lifecycle Mutation Record Durable Relational Contract

## Status
Accepted

## Context
The repo already has:
- one shared Prisma-backed repository bundle through `routed_action_execution_envelope`
- one shared real-Postgres integration flow through `routed_action_execution_envelope`
- `SetupLifecycleMutationRecord` in the domain model
- implemented in-memory persistence and a service-owned write path for `SetupLifecycleMutationRecord`

The next downstream service-owned persistence gap is `setup_lifecycle_mutation_record`.

That entity already exists and participates in the approval-backed setup lifecycle flow, but it did not yet have an explicit durable relational contract. Without that contract, physical schema work for the mutation-audit slice would start from storage guesses instead of a defined boundary.

## Decision
Add a logical durable relational contract for `setup_lifecycle_mutation_record`.

The contract includes:
- one durable record type
- required setup, approval, and feedback-decision references
- previous-status, new-status, and approved-action audit fields
- explicit mutation actor and mutation timestamp fields
- nullable `notes`
- standard product-domain metadata and optimistic version semantics

## Consequences
Positive:
- the first downstream mutation-audit slice now has an explicit logical storage contract
- physical schema work can stay narrow and deterministic
- the repo preserves the pattern of contract first, schema second, adapters third

Tradeoffs:
- this step does not yet add Prisma schema or SQL migration artifacts
- approval/setup/feedback cross-entity consistency remains service-owned in this contract step
- later mutation-slice adapter and integration work remains outside durable relational coverage

## Explicitly not included
- Prisma schema or migration changes
- repository adapter or mapper implementations
- concrete relational repositories or Prisma adapters
- shared implemented-product bundle or integration extension through `setup_lifecycle_mutation_record`
- runtime execution engines
- UI work

## Follow-up
- the Prisma physical schema and SQL migration for `setup_lifecycle_mutation_record` are completed in ADR-057
