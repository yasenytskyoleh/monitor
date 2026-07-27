# ADR-094: Setup-to-Aggregate Flow Repository Composition

## Context

The setup-to-aggregate application flow required each runtime caller to construct six services
and their cross-repository dependencies manually. That made it easy to omit the ResearchRun
service or coordinate a run with an aggregate scope for a different setup or hypothesis.

## Decision

Provide `createSetupToAggregateFlowFromRepositories`. It accepts the existing repository
contracts used by the flow and composes the setup, research, candidate, evaluation, ResearchRun,
and aggregation services internally.

When a ResearchRun input is present, the flow validates before any write that the run and the
run-scoped aggregate share setup, hypothesis, run ID, and the flow's finalized evaluation result.

## Consequences

- an implemented-product relational repository bundle can be passed directly to the application
  flow factory
- all production callers receive the same ResearchRun lifecycle composition
- invalid run/aggregate coordination fails without partially creating product records
