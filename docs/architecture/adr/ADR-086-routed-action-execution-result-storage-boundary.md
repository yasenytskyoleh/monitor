# ADR-086: Routed Action Execution Result Storage Boundary

## Status
Accepted

## Context
`RoutedActionExecutionResult` is the return value of the downstream-action execution-preparation service. It reports successful envelope preparation, no-envelope outcomes, validation and lifecycle rejections, and unexpected preparation failures.

The completed durable product chain already retains successful preparation through `routed_action_execution_envelope`. The result response itself can represent rejected requests before all source identifiers are available, and it has no stable domain identity or service-owned persistence path.

## Decision
Classify `routed_action_execution_result` as product-ephemeral.

Do not add it to the first-class product persisted-entity catalog or define a relational record for the current response type. The durable envelope remains the product-domain audit record for successful preparation. Rejected and failed response details remain transient until a separate retained execution-attempt audit entity, ownership boundary, and runtime-evidence policy are explicitly selected.

## Consequences
Positive:
- the persisted-entity catalog now distinguishes the durable execution envelope from its transient preparation response
- later persistence work cannot infer a product record from a response that may have incomplete input context
- execution-engine scope remains separate from the completed product-domain persistence rollout

Tradeoffs:
- rejected and failed preparation responses are not retained as product-domain records
- a future audit requirement needs a new, purpose-built entity instead of reusing the service response shape

## Explicitly not included
- execution-engine implementation or retry orchestration
- a Prisma model, migration, adapter, mapper, or repository
- changes to execution-preparation behavior
- exchange ingestion or UI work

## Follow-up
- select a new product-domain durable entity, or explicitly design a retained execution-attempt audit entity
