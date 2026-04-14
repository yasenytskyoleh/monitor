# ADR-007: First Product Application Flow

## Status
Accepted

## Context
Product-domain persistence slices now exist for:
- `SetupDefinition`
- `ResearchHypothesis`
- `SignalCandidate`
- `EvaluationResult`
- `SetupAggregateResult`

The remaining gap is application-level coordination: a clear, reviewable flow that shows how these persisted slices are used together before live runtime automation exists.

## Decision
Introduce a first minimal manual/service-driven application flow that coordinates existing domain services in a fixed sequence:
1. setup definition create
2. hypothesis create
3. hypothesis link to setup
4. signal candidate create
5. evaluation create/start/finalize
6. aggregate result create/recompute

Add a thin application layer in `packages/domain-model/src/application`:
- input contract
- result contract
- flow coordinator (`createSetupToAggregateFlow`)

## Ownership boundary
- Domain services retain write ownership and validation.
- Application flow coordinates sequence and failure reporting only.
- Application flow does not absorb domain business logic.

## Failure policy
- Failures before aggregation are blocking and return `failed`.
- Aggregation-stage failure after evaluation completion returns `partial` with warning for manual retry.
- No distributed transaction model is introduced in this slice.

## Consequences
Positive:
- first explicit product application path is documented and testable
- clear service ownership reduces ambiguity before runtime integration
- creates a stable bridge from domain persistence to future execution flows

Trade-offs:
- partial states are possible by design
- manual retry boundary is required for aggregate refresh failures
- runtime automation remains deferred

## Explicitly postponed
- live market-driven orchestration
- background workers/scheduling/event bus
- API/UI flow surfaces
- transaction orchestration redesign
