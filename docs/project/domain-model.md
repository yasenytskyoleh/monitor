# Domain Model

## Purpose
This document defines the first product-side domain slice for Monitor.

The goal of this slice is to provide explicit contracts for:
- market monitoring scope metadata,
- setup and signal research entities,
- evaluation windows and outcomes,
- research hypotheses and run tracking,
- aggregation and setup comparison evidence.

The package remains intentionally narrow, and now includes **implemented in-memory persistence** plus service-owned write paths for:
- `SetupDefinition`
- `ResearchHypothesis`
- `SignalCandidate`
- `EvaluationResult`
- `SetupAggregateResult`
- `ResearchFeedbackDecision`
- `ResearchDecisionApproval`
- `ResearchReviewDecision`
- `ReviewDecisionRoutingResult`
- `RoutedActionExecutionEnvelope`
- `SetupLifecycleMutationRecord`
- `SetupRefinementRequest`
- `SetupDefinitionRevision`
- `SetupRevisionActivationRecord`

It still does not implement runtime ingestion, execution, or statistics engines. Shared implemented-product composition and opt-in real-database integration now both extend through `setup_revision_activation_record`.

## Current implementation status
Implemented in-memory persistence exists today for:
- `SetupDefinition`
- `ResearchHypothesis`
- `SignalCandidate`
- `EvaluationResult`
- `SetupAggregateResult`
- `ResearchFeedbackDecision`
- `ResearchDecisionApproval`
- `ResearchReviewDecision`
- `ReviewDecisionRoutingResult`
- `RoutedActionExecutionEnvelope`
- `SetupLifecycleMutationRecord`
- `SetupRefinementRequest`
- `SetupDefinitionRevision`
- `SetupRevisionActivationRecord`

Durable relational contracts exist today for:
- `SetupDefinition`
- `ResearchHypothesis`
- `SignalCandidate`
- `EvaluationResult`
- `SetupAggregateResult`
- `ResearchFeedbackDecision`
- `ResearchDecisionApproval`
- `ResearchReviewDecision`
- `ReviewDecisionRoutingResult`
- `RoutedActionExecutionEnvelope`
- `SetupLifecycleMutationRecord`
- `SetupRefinementRequest`
- `SetupDefinitionRevision`
- `SetupRevisionActivationRecord`

Committed Prisma schema/migrations, repository adapter contracts, adapter-backed relational repositories, concrete Prisma adapters, shared composition, and opt-in real-database integration coverage now exist for:
- `ReviewDecisionRoutingResult`
- `SetupRevisionActivationRecord`

The one shared Prisma-backed composition and opt-in real-database integration path span the full implemented product chain through `SetupRevisionActivationRecord`, including `ReviewDecisionRoutingResult`.

Durable relational persistence still pending:
- `ExecutionAttemptAudit` is selected for the next durable entity; `RoutedActionExecutionResult`
  remains explicitly ephemeral
- exchange ingestion runtime
- setup-detection / evaluation / aggregation runtime engines
- UI

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
- `ResearchFeedbackDecision`
- `ResearchDecisionApproval`
- `ResearchReviewDecision`
- `ReviewDecisionRoutingResult`
- `RoutedActionExecutionEnvelope`
- planned `ExecutionAttemptAudit`
- `SetupLifecycleMutationRecord`
- `SetupRefinementRequest`
- `SetupDefinitionRevision`
- `SetupRevisionActivationRecord`

Code contracts live in:
- `packages/domain-model/src`

Related product docs:
- `docs/project/research-model.md`
- `docs/project/monitoring-model.md`
- `docs/project/normalized-events.md`
- `docs/project/evaluation-model.md`
- `docs/project/evaluation-result-model.md`
- `docs/project/outcome-metrics.md`
- `docs/project/research-aggregation-model.md`
- `docs/project/setup-aggregate-result-model.md`
- `docs/project/setup-comparison-model.md`
- `docs/project/storage-architecture.md`
- `docs/project/persistence-boundaries.md`
- `docs/project/persistence-implementation-architecture.md`
- `docs/project/first-persisted-slice.md`
- `docs/project/durable-relational-persistence-model.md`
- `docs/project/relational-adapter-rollout-model.md`
- `docs/project/prisma-schema-implementation-model.md`
- `docs/project/relational-repository-implementation-model.md`
- `docs/project/implemented-product-relational-composition-model.md`
- `docs/project/implemented-product-setup-definition-revision-composition-model.md`
- `docs/project/implemented-product-setup-definition-revision-integration-model.md`
- `docs/project/setup-revision-activation-relational-adapter-model.md`
- `docs/project/setup-revision-activation-relational-rollout-model.md`
- `docs/project/setup-revision-activation-model.md`
- `docs/project/setup-revision-activation-relational-persistence-model.md`
- `docs/project/review-decision-routing-result-relational-persistence-model.md`
- `docs/project/review-decision-routing-result-relational-adapter-model.md`
- `docs/project/routed-action-execution-result-storage-model.md`
- `docs/project/execution-attempt-audit-model.md`
- `docs/project/setup-refinement-request-relational-persistence-model.md`
- `docs/project/setup-refinement-request-relational-adapter-model.md`
- `docs/project/setup-refinement-request-relational-rollout-model.md`
- `docs/project/research-feedback-decision-relational-persistence-model.md`
- `docs/project/signal-candidate-model.md`
- `docs/project/first-application-flow.md`
- `docs/project/product-service-flow.md`
- `docs/project/runtime-handoff-model.md`
- `docs/project/detection-to-candidate-flow.md`
- `docs/project/evaluation-trigger-model.md`
- `docs/project/candidate-to-evaluation-flow.md`
- `docs/project/aggregation-refresh-model.md`
- `docs/project/evaluation-to-aggregate-flow.md`

## Out of scope
- exchange connectors and live websocket ingestion
- signal generation engine implementation
- evaluation engine implementation
- execution/trading logic
- additional downstream relational schema/adapter rollout beyond the current core chain
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
- `SignalCandidate` is the first persisted detected product object, tied to one setup and one monitored symbol.
- `SignalCandidate` is not a raw detection hit and not an evaluation result; it is the product-domain handoff record between detection and evaluation.
- `EvaluationWindow` defines when/how long a signal candidate is evaluated.
- `EvaluationInput` defines what observations/context are used for one evaluation pass.
- `EvaluationResult` captures what happened for one signal candidate in one evaluation window.
- `SetupAggregateResult` summarizes multiple evaluation results for one setup + scope.
- `SetupComparison` aligns setup aggregates under a shared scope for descriptive comparison.
- `ResearchHypothesisEvidenceLink` ties aggregate evidence back to hypothesis status updates.
- `ResearchHypothesis` expresses the research idea behind one or more setup definitions.
- `ResearchRun` tracks one bounded execution of a hypothesis evaluation cycle.
- `ResearchFeedbackDecision` captures the explicit recommendation boundary from evidence review into later manual review/approval flows.

## Storage direction (initial)
Storage boundaries are now explicitly defined:
- `runtime_evidence` (orchestrator file-based evidence)
- `product_domain` (implemented in-memory persistence today; durable relational contracts, committed Prisma schema/migrations, repository adapter contracts, executable adapter-backed repositories, concrete Prisma adapters, slice-level shared composition, and opt-in real-database integration coverage now exist for every current durable product entity; one shared implemented-product bundle spans the full chain through `setup_revision_activation_record`)
- `derived_analytics` (deferred)

Current package provides contract-level storage types in `packages/domain-model/src/storage/*`.

Deferred to later slices:
- full detection runtime engine and event processing
- aggregation runtime/job orchestration and advanced evidence analytics
- selection of a new product-domain durable entity; `routed_action_execution_result` remains ephemeral
- data retention policies

## Acceptance criteria for this slice
- product entities are explicit and typed
- orchestration/product boundary is written and enforceable by structure
- setup/signal/evaluation concepts are measurable, not prose-only
- persisted product objects are introduced incrementally through narrow repository/service slices
