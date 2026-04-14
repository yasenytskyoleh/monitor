# ADR-005: Product-Domain Storage Architecture

## Status
Accepted — 2026-04-14

## Context
After monitoring, evaluation, and aggregation contracts were defined, product entities still lacked explicit persistence-layer boundaries.

Without storage architecture, future implementation risks mixing:
- orchestration runtime evidence,
- product-domain records,
- and derived analytics artifacts.

## Decision
Adopt a three-layer storage boundary model:
- Layer A: `runtime_evidence` (filesystem artifacts for orchestrator traces)
- Layer B: `product_domain` (relational persistence planned for first-class entities)
- Layer C: `derived_analytics` (postponed)

First-class persisted product entities in this slice:
- `MonitoredSymbol`
- `SetupDefinition`
- `SignalCandidate`
- `EvaluationResult`
- `ResearchHypothesis`
- `SetupAggregateResult`

Technology direction:
- keep orchestrator runtime artifacts file-based
- plan product-domain persistence toward PostgreSQL + Prisma
- postpone analytics storage implementation

## Consequences

### Positive
- clear separation between operational traces and product state
- future repository/database work can proceed under explicit boundaries
- traceability from orchestration runs to product records remains possible via metadata links

### Tradeoffs
- product persistence remains directional (no DB schema/runtime yet)
- derived analytics design remains postponed until scoring architecture is clearer

## Explicitly postponed
- Prisma schema and migrations
- repository implementation
- DB write/read runtime logic
- analytics cache/materialization engines

## Guardrails
- no database implementation in this ADR
- no orchestration artifact redesign in this ADR
- no runtime ingestion/detection/evaluation engine work in this ADR

## Follow-up ADRs
- ADR-006 defines repository/service boundaries and write ownership before DB implementation.
