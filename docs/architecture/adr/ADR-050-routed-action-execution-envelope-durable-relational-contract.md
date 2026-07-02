# ADR-050: Routed Action Execution Envelope Durable Relational Contract

## Status
Accepted

## Context
The repo already has:
- one shared Prisma-backed repository bundle through `research_review_decision`
- one shared real-Postgres integration flow through `research_review_decision`
- `RoutedActionExecutionEnvelope` in the domain model
- implemented in-memory persistence and a service-owned write path for `RoutedActionExecutionEnvelope`

The next downstream service-owned persistence gap is `routed_action_execution_envelope`.

That entity already exists and participates in the review-to-execution preparation flow, but it did not yet have an explicit durable relational contract. Without that contract, physical schema work for the execution-envelope slice would start from storage guesses instead of a defined boundary.

## Decision
Add a logical durable relational contract for `routed_action_execution_envelope`.

The contract includes:
- one durable record type
- required routing-result and review-decision references
- structured target-entity, route-metadata, and execution-payload snapshots
- execution status and preparation audit fields
- nullable `originRunId` and nullable `notes`
- standard product-domain metadata and optimistic version semantics

## Consequences
Positive:
- the first downstream execution-envelope slice now has an explicit logical storage contract
- physical schema work can stay narrow and deterministic
- the repo preserves the pattern of contract first, schema second, adapters third

Tradeoffs:
- this step does not yet add Prisma schema or SQL migration artifacts
- routing results remain query/runtime-owned references rather than relational FK targets in this step
- later execution and mutation durable slices remain outside durable relational coverage

## Explicitly not included
- Prisma schema or migration changes
- repository adapter or mapper implementations
- concrete relational repositories or Prisma adapters
- later execution and mutation durable slices
- runtime execution engines
- UI work

## Follow-up
- add the Prisma physical schema and SQL migration for `routed_action_execution_envelope`
