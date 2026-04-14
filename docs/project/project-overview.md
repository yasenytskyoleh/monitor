# Project Overview

## Project
**Monitor**

## Summary
Monitor is an **agent-assisted crypto monitoring and research platform**.

In the long term, it is intended to become a structured system for:
- monitoring market conditions,
- formalizing setup and signal ideas,
- evaluating them statistically,
- enriching them with context,
- and turning them into explainable decision support.

## Current product positioning
At the current stage, Monitor should be described as:

> **An agent-driven orchestration foundation with an initial product-domain model for a future crypto monitoring platform**

It is **not yet**:
- a trading system,
- a production signal engine,
- a market data platform,
- or an autonomous trading bot.

## Current implementation status
The orchestration foundation is functional and test-backed, and the first product-domain contracts now include monitoring, evaluation, research-aggregation, and storage-boundary architecture contracts.

Implemented today:
- config + schema + semantic-validation platform (`packages/agent-config`)
- compiled immutable runtime snapshots with version/checksum
- workflow runner with `mock` and `live` modes
- per-agent execution control (`--agent-mode`)
- strict transition guardrails with approval-gated edges
- artifact/reference enforcement with role allowlists
- run persistence for transitions, artifacts, approvals, and terminal outcomes
- live-capable agent chain:
  - Product
  - Architect
  - Quant Pattern
  - Backend (constrained patch mode)
  - Docs Reviewer
- first product-side contracts package (`packages/domain-model`) with explicit entities:
  - `MonitoredSymbol`
  - `MarketDataSource`
  - `NormalizedMarketEvent` (`PriceTickEvent`, `CandleClosedEvent`, `VolumeUpdateEvent`, `MonitoringHeartbeatEvent`)
  - `SetupDefinition`
  - `SignalCandidate`
  - `EvaluationInput`
  - `EvaluationWindow`
  - `EvaluationResult`
  - `EvaluationMetrics`
  - `SetupAggregateResult`
  - `SetupComparison`
  - `ResearchHypothesisEvidenceLink`
  - storage contracts (`StorageBoundary`, `EntityIdentity`, `PersistedEntity`, `ProductRecordMetadata`)
  - `ResearchHypothesis`
  - `ResearchRun`
- product-domain docs and ADR:
  - `docs/project/domain-model.md`
  - `docs/project/research-model.md`
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

Current limitation:
- Backend live remains constrained to strict allowlisted patch mode:
  - isolated apply + verification + rollback + controlled promotion
  - narrow helper-file creation only
  - no broad refactors, schema/migration/architecture changes, or cross-package scope

## Core philosophy
The project is intentionally built as a **controlled orchestration system**, not as a collection of freeform AI prompts.

This means:
- docs define human contracts,
- YAML configs define editable operational behavior,
- JSON Schemas define machine validation,
- runtime code enforces those rules,
- agents operate under explicit boundaries, permissions, and workflow states.

## Why the project exists
The main motivation is to create a system where AI agents can help with:
- research,
- planning,
- architecture work,
- workflow execution,
- and later signal/pattern development,

without losing:
- control,
- traceability,
- validation,
- reproducibility,
- and architectural discipline.

The new product-domain contracts are intentionally thin:
- no ingestion runtime engine yet,
- no evaluation runtime engine yet,
- no aggregation runtime engine yet,
- no statistics/scoring engine yet,
- no database/repository runtime implementation yet,
- no exchange integration yet.

## Long-term product idea
In its fuller form, Monitor is meant to become a **crypto market monitoring, signal research, and decision-support platform**.

The product vision is closer to:

> **a research and monitoring operating system for crypto setups**

than to:

> **a black-box system that buys and sells automatically**.

## User problem it solves
In discretionary or semi-systematic trading/research, useful ideas are often lost in chaos:
- too many charts,
- too many indicators,
- weak traceability,
- no structured evaluation of pattern quality,
- no long-term storage of what worked,
- fragmented workflows across alerts, notes, and manual analysis.

Monitor aims to turn that chaos into a **structured system**.

## Core product promise
The core promise of Monitor is:

> “Help me turn trading and market ideas into structured, testable, monitored, and explainable workflows.”

## Intended users
The most natural users are:
- individual trader/researchers,
- technically oriented discretionary traders,
- quant-curious builders,
- small teams that want structured market research instead of uncontrolled signal spam.

## Conceptual product layers
1. **Orchestration foundation**  
   roles, workflows, approvals, configs, schemas, runtime validation, artifact persistence

2. **Research operating layer**  
   setup definitions, hypotheses, evaluation flows, research artifacts

3. **Monitoring layer**  
   market watching and candidate event generation

4. **Evaluation and scoring layer**  
   statistical comparison and quality estimation

5. **Enrichment layer**  
   later: regime and news-like context

6. **Decision-support layer**  
   structured and explainable setup intelligence for the user

## Long-term positioning
A good long-term positioning line:

> **Monitor is a structured crypto monitoring and signal-research platform that turns ideas, workflows, and market observations into validated, traceable decision support.**
