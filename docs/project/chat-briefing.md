# Chat Briefing

## Reusable project briefing
I am working on **Monitor**, a monorepo TypeScript project that combines:
- a controlled agent orchestration foundation, and
- product-domain contracts for monitoring, evaluation, research evidence, storage, and persistence implementation boundaries.

The primary working model is a **Codex-first workflow**:
- Codex is the main operator for planning, implementation, and repo coordination
- the internal orchestration subsystem remains an in-repo supporting subsystem for constrained, auditable workflow automation

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
  - implemented in-memory persistence for `SetupDefinition`, `ResearchHypothesis`, `SignalCandidate`, `EvaluationResult`, and `SetupAggregateResult`
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
  - `docs/project/durable-relational-persistence-model.md`
  - `docs/project/relational-adapter-rollout-model.md`
  - `docs/project/prisma-schema-implementation-model.md`
  - `docs/architecture/adr/ADR-001-first-product-domain-slice.md`
  - `docs/architecture/adr/ADR-002-market-monitoring-ingestion-architecture.md`
  - `docs/architecture/adr/ADR-003-signal-evaluation-outcome-model.md`
  - `docs/architecture/adr/ADR-004-evaluation-aggregation-and-research-model.md`
  - `docs/architecture/adr/ADR-005-product-domain-storage-architecture.md`
  - `docs/architecture/adr/ADR-006-product-domain-repository-and-service-architecture.md`
  - `docs/architecture/adr/ADR-026-first-durable-relational-persistence-contract.md`
  - `docs/architecture/adr/ADR-027-first-relational-adapter-rollout-design.md`
  - `docs/architecture/adr/ADR-028-first-prisma-schema-and-migration-layout.md`

## Current constraints
- spot-only scope
- no exchange connector runtime implementation yet
- no setup-detection runtime engine yet
- no evaluation runtime engine yet
- no aggregation/scoring runtime engine yet
- first durable relational contract exists for `setup_definition` and `research_hypothesis`
- first relational adapter rollout design exists for `setup_definition` and `research_hypothesis`
- first physical Prisma schema and initial migration now exist for `setup_definition` and `research_hypothesis`
- durable relational runtime adapters pending
- no Prisma client/runtime wiring yet
- no UI yet
- no automated trading logic

## Recommended next step
- wire Prisma tooling and implement relational repositories/adapters for the first durable slice, starting with `setup_definition` and `research_hypothesis`

## Behavioral instructions for future assistants
When continuing this project:
1. preserve the Codex-first workflow and use the internal orchestration subsystem as a supporting tool, not as the required primary interface
2. preserve orchestration safety constraints while product-domain implementation grows
3. keep orchestrator runtime evidence and product-domain persistence separate
4. enforce service-owned write paths and repository-owned persistence abstraction
5. keep runtime engines out of scope and keep relational adapter/runtime implementation narrowly aligned to the committed persistence contracts
6. prefer small, explicit, reviewable PR-sized steps
