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

> **A Codex-first workflow around an internal orchestration subsystem and an initial product-domain model for a future crypto monitoring platform**

It is **not yet**:
- a trading system,
- a production signal engine,
- a market data platform,
- or an autonomous trading bot.

## Current implementation status
The repo is already usable through a **Codex-first workflow**:
- Codex is the primary day-to-day operator for planning, implementation, and repo coordination
- bounded autonomous mode now has an explicit step-by-step operating policy in `docs/project/autonomous-mode-policy.md`
- the internal orchestration subsystem remains in the repo as a constrained, test-backed supporting subsystem

The internal orchestration subsystem is functional and test-backed, and the product domain now includes monitoring, evaluation, research-aggregation, storage-boundary, repository/service architecture, and implemented in-memory persistence.

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
  - `ResearchFeedbackDecision`
  - `ResearchDecisionApproval`
  - `ResearchReviewDecision`
  - storage contracts (`StorageBoundary`, `EntityIdentity`, `PersistedEntity`, `ProductRecordMetadata`)
  - repository contracts (`*Repository`)
  - service contracts (`*Service`) with explicit write ownership
  - `ResearchHypothesis`
  - `ResearchRun`
- implemented in-memory persistence and service-owned write paths for:
  - `SetupDefinition`
  - `ResearchHypothesis`
  - `SignalCandidate`
  - `EvaluationResult`
  - `SetupAggregateResult`
  - `ResearchFeedbackDecision`
  - `ResearchDecisionApproval`
  - `ResearchReviewDecision`
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
  - `docs/project/persistence-implementation-architecture.md`
  - `docs/project/first-persisted-slice.md`
  - `docs/project/durable-relational-persistence-model.md`
  - `docs/project/relational-adapter-rollout-model.md`
  - `docs/project/prisma-schema-implementation-model.md`
  - `docs/project/relational-repository-implementation-model.md`
  - `docs/project/signal-evaluation-relational-rollout-model.md`
  - `docs/project/setup-aggregate-relational-persistence-model.md`
  - `docs/project/setup-aggregate-relational-rollout-model.md`
  - `docs/project/implemented-product-relational-composition-model.md`
  - `docs/project/implemented-product-feedback-decision-composition-model.md`
  - `docs/project/implemented-product-approval-composition-model.md`
  - `docs/project/implemented-product-approval-integration-model.md`
  - `docs/project/research-feedback-decision-relational-persistence-model.md`
  - `docs/project/research-feedback-decision-relational-rollout-model.md`
  - `docs/project/research-decision-approval-relational-persistence-model.md`
  - `docs/project/research-decision-approval-relational-adapter-model.md`
  - `docs/project/research-decision-approval-relational-rollout-model.md`
  - `docs/project/research-review-decision-relational-persistence-model.md`
  - `docs/architecture/adr/ADR-001-first-product-domain-slice.md`
  - `docs/architecture/adr/ADR-002-market-monitoring-ingestion-architecture.md`
  - `docs/architecture/adr/ADR-003-signal-evaluation-outcome-model.md`
  - `docs/architecture/adr/ADR-004-evaluation-aggregation-and-research-model.md`
  - `docs/architecture/adr/ADR-005-product-domain-storage-architecture.md`
  - `docs/architecture/adr/ADR-006-product-domain-repository-and-service-architecture.md`
  - `docs/architecture/adr/ADR-026-first-durable-relational-persistence-contract.md`
  - `docs/architecture/adr/ADR-027-first-relational-adapter-rollout-design.md`
  - `docs/architecture/adr/ADR-028-first-prisma-schema-and-migration-layout.md`
  - `docs/architecture/adr/ADR-029-first-adapter-backed-relational-repositories.md`
  - `docs/architecture/adr/ADR-030-signal-evaluation-durable-relational-rollout.md`
  - `docs/architecture/adr/ADR-031-setup-aggregate-durable-relational-contract-and-schema.md`
  - `docs/architecture/adr/ADR-032-setup-aggregate-adapter-backed-relational-repositories.md`
  - `docs/architecture/adr/ADR-033-shared-implemented-product-relational-composition.md`
  - `docs/architecture/adr/ADR-034-research-feedback-decision-durable-relational-contract.md`
  - `docs/architecture/adr/ADR-035-research-feedback-decision-prisma-schema-layout.md`
  - `docs/architecture/adr/ADR-036-research-feedback-decision-adapter-backed-relational-repositories.md`
  - `docs/architecture/adr/ADR-037-implemented-product-feedback-decision-composition.md`
  - `docs/architecture/adr/ADR-038-research-decision-approval-durable-relational-contract.md`
  - `docs/architecture/adr/ADR-039-research-decision-approval-prisma-schema-layout.md`
  - `docs/architecture/adr/ADR-040-research-decision-approval-relational-adapter-contract.md`
  - `docs/architecture/adr/ADR-041-research-decision-approval-adapter-backed-relational-repositories.md`
  - `docs/architecture/adr/ADR-042-implemented-product-approval-composition.md`
  - `docs/architecture/adr/ADR-043-implemented-product-approval-integration-coverage.md`
  - `docs/architecture/adr/ADR-044-research-review-decision-durable-relational-contract.md`

Current limitation:
- Backend live remains constrained to strict allowlisted patch mode:
  - isolated apply + verification + rollback + controlled promotion
  - narrow helper-file creation only
  - no broad refactors, schema/migration/architecture changes, or cross-package scope
- durable relational persistence pending:
  - durable relational contracts now exist for `setup_definition`, `research_hypothesis`, `signal_candidate`, `evaluation_result`, `setup_aggregate_result`, `research_feedback_decision`, `research_decision_approval`, and `research_review_decision`
  - committed Prisma schema/migrations now exist through `research_decision_approval`
  - repository adapter contracts now also exist through `research_decision_approval`
  - adapter-backed relational repositories, concrete Prisma adapters, and slice-level shared composition now exist for all five core-chain service-owned product entities, `research_feedback_decision`, and `research_decision_approval`
  - opt-in real-database integration coverage now exists for the five core-chain entities, `research_feedback_decision`, and the shared implemented-product chain through `research_decision_approval`
  - one shared Prisma-backed repository bundle now spans the full implemented product chain through `research_decision_approval`
  - one end-to-end real-database integration flow now also spans the full implemented product chain through `research_decision_approval`
  - the next downstream durable persistence gap is now the adapter/repository layer for `research_review_decision`
  - no exchange ingestion runtime yet
  - no setup-detection / evaluation / aggregation runtime engines yet
  - no UI yet

Current recommended next step:
- add the adapter boundary and repository rollout for `research_review_decision`

## Core philosophy
The project is intentionally built as a **controlled orchestration system**, not as a collection of freeform AI prompts.

This means:
- docs define human contracts,
- YAML configs define editable operational behavior,
- JSON Schemas define machine validation,
- runtime code enforces those rules,
- agents operate under explicit boundaries, permissions, and workflow states.

## Why the project exists
The main motivation is to create a system where Codex and constrained automation can help with:
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
- durable relational persistence/runtime adapters pending,
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
