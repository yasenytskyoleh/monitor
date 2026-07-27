# ADR-093: Research Run Application-Flow Integration

## Context

The product flow could create a candidate, finalize an evaluation, and aggregate the result,
but it did not exercise the new ResearchRun lifecycle path. That left run-scoped aggregation
available only to callers that manually coordinated repository and service calls.

## Decision

Extend `SetupToAggregateFlow` with an optional ResearchRun input and service dependency. When
provided, the flow:

1. creates and starts the planned run after candidate creation
2. records the finalized evaluation result on the running run
3. completes the run before creating and recomputing the aggregate

The flow remains backward compatible for callers without a run input. A focused integration
test composes real in-memory services and verifies the completed run and run-scoped aggregate.

## Consequences

- the canonical application path now demonstrates a complete run lifecycle
- aggregation uses verified run context without introducing a scheduler or job runtime
- runtime composition can opt in gradually by providing the lifecycle service and run input
