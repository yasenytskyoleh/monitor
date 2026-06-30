# Chat Briefing

## Reusable project briefing
I am working on **Monitor**, a monorepo TypeScript project that combines:
- a controlled agent orchestration foundation, and
- product-domain contracts for monitoring, evaluation, research evidence, storage, and persistence implementation boundaries.

The primary working model is a **Codex-first workflow**:
- Codex is the main operator for planning, implementation, and repo coordination
- bounded autonomous execution is allowed when it follows `docs/project/autonomous-mode-policy.md`
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
  - research feedback contracts (`ResearchFeedbackDecision`)
  - research review contracts (`ResearchDecisionApproval`, `ResearchReviewDecision`)
  - storage contracts (`StorageBoundary`, `EntityIdentity`, `PersistedEntity`, `ProductRecordMetadata`)
  - repository contracts (`*Repository` interfaces)
  - service contracts (`*Service` interfaces + write-path ownership)
  - implemented in-memory persistence for `SetupDefinition`, `ResearchHypothesis`, `SignalCandidate`, `EvaluationResult`, `SetupAggregateResult`, `ResearchFeedbackDecision`, `ResearchDecisionApproval`, and `ResearchReviewDecision`
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

## Current constraints
- spot-only scope
- no exchange connector runtime implementation yet
- no setup-detection runtime engine yet
- no evaluation runtime engine yet
- no aggregation/scoring runtime engine yet
- durable relational contracts now exist for:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
  - `research_feedback_decision`
  - `research_decision_approval`
  - `research_review_decision`
- committed Prisma schema/migrations now exist for:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
  - `research_feedback_decision`
  - `research_decision_approval`
- repository adapter contracts now also exist for:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
  - `research_feedback_decision`
  - `research_decision_approval`
- adapter-backed repositories, concrete Prisma adapters, slice-level shared composition, and opt-in real-database integration coverage now exist for:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
  - `research_feedback_decision`
- adapter-backed repositories, concrete Prisma adapters, and slice-level shared composition now also exist for:
  - `research_decision_approval`
- one shared Prisma-backed repository bundle now spans the full implemented product chain through `research_decision_approval`
- one end-to-end real-database integration flow now also spans the full implemented product chain through `research_decision_approval`
- the next downstream durable persistence gap is now the adapter/repository layer for `research_review_decision`
- no UI yet
- no automated trading logic

## Recommended next step
- add the adapter boundary and repository rollout for `research_review_decision`

## Behavioral instructions for future assistants
When continuing this project:
1. preserve the Codex-first workflow and use the internal orchestration subsystem as a supporting tool, not as the required primary interface
2. preserve orchestration safety constraints while product-domain implementation grows
3. keep orchestrator runtime evidence and product-domain persistence separate
4. enforce service-owned write paths and repository-owned persistence abstraction
5. keep runtime engines out of scope and keep new durable slices narrowly aligned to the committed adapter/repository/integration pattern
6. prefer small, explicit, reviewable PR-sized steps
