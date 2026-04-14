# Chat Briefing

## Reusable project briefing
I am working on **Monitor**, a monorepo TypeScript project that combines:
- a controlled agent orchestration foundation, and
- product-domain contracts for monitoring, evaluation, research evidence, storage, and persistence implementation boundaries.

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
  - repository contracts (`*Repository` interfaces)
  - service contracts (`*Service` interfaces + write-path ownership)
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
  - `docs/project/persistence-implementation-architecture.md`
  - `docs/project/first-persisted-slice.md`
  - `docs/architecture/adr/ADR-001-first-product-domain-slice.md`
  - `docs/architecture/adr/ADR-002-market-monitoring-ingestion-architecture.md`
  - `docs/architecture/adr/ADR-003-signal-evaluation-outcome-model.md`
  - `docs/architecture/adr/ADR-004-evaluation-aggregation-and-research-model.md`
  - `docs/architecture/adr/ADR-005-product-domain-storage-architecture.md`
  - `docs/architecture/adr/ADR-006-product-domain-repository-and-service-architecture.md`

## Current constraints
- spot-only scope
- no exchange connector runtime implementation yet
- no setup-detection runtime engine yet
- no evaluation runtime engine yet
- no aggregation/scoring runtime engine yet
- no database/repository runtime implementation yet
- no automated trading logic

## Recommended next step
- define schema-planning and repository-runtime rollout for the first persisted slice (`setup_definition`, `research_hypothesis`)

## Behavioral instructions for future assistants
When continuing this project:
1. preserve orchestration safety constraints while product-domain implementation grows
2. keep orchestrator runtime evidence and product-domain persistence separate
3. enforce service-owned write paths and repository-owned persistence abstraction
4. keep runtime engines and DB implementation out of scope until architecture contracts are explicit
5. prefer small, explicit, reviewable PR-sized steps
