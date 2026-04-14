# ADR-010: Evaluation-to-Aggregation Refresh Trigger

## Status
Accepted

## Context
Candidate-to-evaluation trigger is already defined and `EvaluationResult` persistence exists.
The next runtime boundary is how completed evaluations update aggregate research evidence.

## Decision
Introduce a narrow runtime handoff contract for aggregation refresh:
- input: `EvaluationAggregationRefreshTrigger`
- resolved command: `RefreshAggregateFromEvaluationCommand`
- output: `AggregationRefreshResult`
- coordinator: `createEvaluationToAggregationRefreshHandoff`

Coordinator behavior:
- validates trigger payload
- requires persisted `EvaluationResult` in `completed` status
- validates candidate/setup linkage
- resolves aggregation scope deterministically
- applies create-vs-recompute policy through `ResearchAggregationService`

## Ownership boundary
- Evaluation side owns evaluation lifecycle and completion integrity
- Aggregation side owns aggregate create/recompute semantics and evidence state
- Runtime handoff layer coordinates explicit boundary checks and returns explicit outcomes

## Duplicate and recompute policy
- aggregates are unique per `(setupDefinitionId, aggregationScope)`
- if no aggregate exists, create pending and recompute
- if aggregate exists, recompute existing aggregate (idempotent refresh behavior)

## Failure policy
- missing/invalid references -> `rejected_validation`
- non-completed evaluation status -> `rejected_lifecycle`
- unexpected runtime/service errors -> `failed` with retry warning

## Consequences
Positive:
- explicit runtime bridge from outcomes to research evidence
- deterministic scope/refresh behavior prior to runtime job infrastructure
- keeps separation between runtime artifacts and product persistence

Trade-offs:
- first scope policy is intentionally simple
- no scheduling/retry engine in this slice

## Explicitly postponed
- aggregation job scheduler/worker infrastructure
- fanout multi-scope recomputation
- hypothesis evidence scoring/update engine
- advanced analytics/statistical significance runtime
