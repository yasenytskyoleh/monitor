# ADR-091: Research Run Aggregation Context Integrity

## Context

`AggregationScope` can identify the `ResearchRun` whose evidence is being summarized. The
reference is deliberately not a relational foreign key because aggregate scope stays portable
and optional, but that previously allowed a run identifier to disagree with an aggregate's
setup, hypothesis, or recomputed evidence.

## Decision

When `aggregationScope.researchRunId` is present, `ResearchAggregationService` must:

- resolve the run before creating or recomputing the aggregate
- require its setup and any declared hypothesis to match the aggregate context
- require each recomputed evaluation result, signal candidate, and evaluation window to be
  listed by the run

Aggregates without a run reference retain the existing behavior.

## Consequences

- run-scoped aggregates cannot accidentally combine evidence from a different run
- the repository contract stays unchanged; validation remains service-owned
- runtime aggregation jobs remain outside this decision
