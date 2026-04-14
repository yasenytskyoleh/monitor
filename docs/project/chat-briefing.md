# Chat Briefing

## Reusable project briefing
I am working on **Monitor**, a monorepo TypeScript project that combines:
- a controlled agent orchestration foundation, and
- product-domain contracts for monitoring/research.

Current foundation scope includes:
- docs + configs + schemas + runtime guardrails
- orchestrated workflow execution with approvals and artifact enforcement
- constrained backend live mode with isolated apply/verify/rollback/promotion

Current product-domain scope includes:
- `packages/domain-model` with:
  - `MonitoredSymbol`
  - `MarketDataSource`
  - `NormalizedMarketEvent` (`PriceTickEvent`, `CandleClosedEvent`, `VolumeUpdateEvent`, `MonitoringHeartbeatEvent`)
  - `SetupDefinition`
  - `SignalCandidate`
  - `EvaluationWindow`
  - `EvaluationResult`
  - `ResearchHypothesis`
  - `ResearchRun`
- docs and ADRs:
  - `docs/project/domain-model.md`
  - `docs/project/research-model.md`
  - `docs/project/monitoring-model.md`
  - `docs/project/normalized-events.md`
  - `docs/architecture/adr/ADR-001-first-product-domain-slice.md`
  - `docs/architecture/adr/ADR-002-market-monitoring-ingestion-architecture.md`

The current workflow states are:
- `INTAKE`
- `DESIGN`
- `FORMALIZE`
- `IMPLEMENT`
- `REVIEW`
- `APPROVAL`
- `PUBLISH_SIGNAL`
- `DONE`
- `REJECTED`

## Current constraints
- spot-only scope
- no automated trading logic
- no futures/leverage funding logic
- no exchange connector runtime implementation yet
- no setup-detection runtime engine yet
- no statistics engine implementation yet
- no UI/dashboard implementation yet

## Recommended next step
- define setup-detection architecture against the normalized event model (without full implementation yet)

## Behavioral instructions for future assistants
When continuing this project:
1. preserve orchestration safety constraints while product-domain implementation grows
2. keep orchestration-domain and product-domain boundaries explicit
3. keep provider payload handling outside domain contracts
4. prioritize consistency between docs, contracts, config, schemas, and runtime behavior
5. prefer small, explicit, reviewable PR-sized steps
