# Chat Briefing

## Reusable project briefing
I am working on **Monitor**, a monorepo TypeScript project that combines:
- a controlled agent orchestration foundation, and
- product-domain contracts for monitoring, evaluation, research evidence, and storage boundaries.

Current foundation scope includes:
- docs + configs + schemas + runtime guardrails
- orchestrated workflow execution with approvals and artifact enforcement
- constrained backend live mode with isolated apply/verify/rollback/promotion

Current product-domain scope includes:
- `packages/domain-model` with:
  - monitoring contracts (`MonitoredSymbol`, `MarketDataSource`, `NormalizedMarketEvent`)
  - setup/signal contracts (`SetupDefinition`, `SignalCandidate`)
  - evaluation contracts (`EvaluationInput`, `EvaluationWindow`, `EvaluationResult`, `EvaluationMetrics`, `EvaluationStatus`)
  - research evidence contracts (`AggregationScope`, `SetupAggregateResult`, `SetupComparison`, `ResearchHypothesisEvidenceLink`)
  - storage contracts (`StorageBoundary`, `EntityIdentity`, `PersistedEntity`, `ProductRecordMetadata`)
  - hypothesis/run contracts (`ResearchHypothesis`, `ResearchRun`)
- docs and ADRs:
  - `docs/project/domain-model.md`
  - `docs/project/monitoring-model.md`
  - `docs/project/normalized-events.md`
  - `docs/project/evaluation-model.md`
  - `docs/project/outcome-metrics.md`
  - `docs/project/research-aggregation-model.md`
  - `docs/project/setup-comparison-model.md`
  - `docs/project/storage-architecture.md`
  - `docs/project/persistence-boundaries.md`
  - `docs/architecture/adr/ADR-001-first-product-domain-slice.md`
  - `docs/architecture/adr/ADR-002-market-monitoring-ingestion-architecture.md`
  - `docs/architecture/adr/ADR-003-signal-evaluation-outcome-model.md`
  - `docs/architecture/adr/ADR-004-evaluation-aggregation-and-research-model.md`
  - `docs/architecture/adr/ADR-005-product-domain-storage-architecture.md`

## Current constraints
- spot-only scope
- no exchange connector runtime implementation yet
- no setup-detection runtime engine yet
- no evaluation runtime engine yet
- no aggregation/scoring runtime engine yet
- no database/repository runtime implementation yet
- no automated trading logic

## Recommended next step
- define product-domain repository and schema-planning contracts without DB implementation

## Behavioral instructions for future assistants
When continuing this project:
1. preserve orchestration safety constraints while product-domain implementation grows
2. keep orchestrator runtime evidence and product-domain persistence separate
3. keep runtime engines out of scope until architecture contracts are explicit
4. keep provider payload handling outside domain contracts
5. prefer small, explicit, reviewable PR-sized steps
