# Domain Model

## Purpose
This document defines the first product-side domain slice for Monitor.

The goal of this slice is to provide explicit contracts for:
- market monitoring scope metadata,
- setup and signal research entities,
- evaluation windows and outcomes,
- research hypotheses and run tracking,
- aggregation and setup comparison evidence.

This is a design-and-contracts slice only. It does not implement ingestion, execution, or statistics engines.

## Included in this slice
- `MonitoredSymbol`
- `MarketDataSource`
- `NormalizedMarketEvent` (`PriceTickEvent`, `CandleClosedEvent`, `VolumeUpdateEvent`, `MonitoringHeartbeatEvent`)
- `SetupDefinition`
- `SignalCandidate`
- `EvaluationInput`
- `EvaluationWindow`
- `EvaluationResult`
- `SetupAggregateResult`
- `SetupComparison`
- `ResearchHypothesisEvidenceLink`
- `ResearchHypothesis`
- `ResearchRun`

Code contracts live in:
- `packages/domain-model/src`

Related product docs:
- `docs/project/research-model.md`
- `docs/project/monitoring-model.md`
- `docs/project/normalized-events.md`
- `docs/project/evaluation-model.md`
- `docs/project/outcome-metrics.md`
- `docs/project/research-aggregation-model.md`
- `docs/project/setup-comparison-model.md`

## Out of scope
- exchange connectors and live websocket ingestion
- signal generation engine implementation
- evaluation engine implementation
- execution/trading logic
- DB migrations and storage adapters
- UI/dashboard work
- news/sentiment enrichment

## Domain boundary

### Orchestration domain (existing foundation)
Owned by `packages/agent-config`, `packages/orchestrator-core`, `apps/orchestrator-runner`.

Examples:
- agent workflow states and transitions
- approvals and transition guardrails
- run artifact persistence
- backend isolated apply/verify/rollback/promotion mechanics

### Product domain (this slice)
Owned by `packages/domain-model`.

Examples:
- which symbols are tracked
- how setups are defined
- how signal candidates are represented
- how evaluation windows/results are represented
- how research hypotheses/runs are represented

Rule: orchestration executes workflows; product domain defines market/research meaning.

## Entity relationships
- `MonitoredSymbol` is the tracked market instrument context.
- `MarketDataSource` defines provider/symbol mapping/reliability assumptions.
- `NormalizedMarketEvent` provides stable observations from monitoring ingestion boundaries.
- `SetupDefinition` expresses measurable conditions and assumptions.
- `SignalCandidate` is a detected candidate tied to one setup and one monitored symbol.
- `EvaluationWindow` defines when/how long a signal candidate is evaluated.
- `EvaluationInput` defines what observations/context are used for one evaluation pass.
- `EvaluationResult` captures what happened for one signal candidate in one evaluation window.
- `SetupAggregateResult` summarizes multiple evaluation results for one setup + scope.
- `SetupComparison` aligns setup aggregates under a shared scope for descriptive comparison.
- `ResearchHypothesisEvidenceLink` ties aggregate evidence back to hypothesis status updates.
- `ResearchHypothesis` expresses the research idea behind one or more setup definitions.
- `ResearchRun` tracks one bounded execution of a hypothesis evaluation cycle.

## Storage direction (initial)
Current package provides only TypeScript contracts and enums.

Deferred to later slices:
- persistence model selection
- repository interfaces
- schema/migration strategy
- data retention policies

## Acceptance criteria for this slice
- product entities are explicit and typed
- orchestration/product boundary is written and enforceable by structure
- setup/signal/evaluation concepts are measurable, not prose-only
- implementation remains intentionally thin (contracts/docs only)
