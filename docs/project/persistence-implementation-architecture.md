# Persistence Implementation Architecture

## Purpose
Define the current implementation architecture for product-domain persistence across the implemented core research chain, the first downstream review entity, and the first downstream approval entity.

This document now reflects:
- boundary contracts
- the current implemented in-memory persistence surface
- current durable relational repository/adapter coverage for the core research chain

## Canonical current-state summary
Implemented in-memory persistence and service-owned write paths exist today for:
- `SetupDefinition`
- `ResearchHypothesis`
- `SignalCandidate`
- `EvaluationResult`
- `SetupAggregateResult`
- `ResearchFeedbackDecision`
- `ResearchDecisionApproval`

Durable relational coverage now exists for the core research chain:
- committed contracts, schema/migrations, adapter-backed repositories, and concrete Prisma adapters for:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
- one shared Prisma-backed repository bundle and one end-to-end integration path for setup -> candidate -> evaluation -> aggregate -> feedback decision
- committed contracts, schema/migrations, adapter-backed repositories, concrete Prisma adapters, slice-level shared composition, and opt-in real-Postgres integration coverage now also exist for `research_feedback_decision`
- committed contracts, schema/migrations, adapter-backed repositories, concrete Prisma adapters, and slice-level shared composition now also exist for `research_decision_approval`

Still pending:
- shared implemented-product bundle extension and opt-in real-Postgres integration rollout for `research_decision_approval`
- later review/approval/execution durable slices
- exchange ingestion runtime
- setup-detection / evaluation / aggregation runtime engines
- UI

## Repository boundaries
Repository interfaces are defined in `packages/domain-model/src/repositories/*`.

Repository abstractions:
- `MonitoredSymbolRepository`
- `SetupDefinitionRepository`
- `SignalCandidateRepository`
- `EvaluationResultRepository`
- `ResearchHypothesisRepository`
- `SetupAggregateResultRepository`
- `ResearchFeedbackDecisionRepository`
- `ResearchDecisionApprovalRepository`

Implemented concrete repositories in the current baseline:
- `InMemorySetupDefinitionRepository` (`packages/domain-model/src/repositories/setup-definition-repository.impl.ts`)
- `InMemoryResearchHypothesisRepository` (`packages/domain-model/src/repositories/research-hypothesis-repository.impl.ts`)
- `InMemorySignalCandidateRepository` (`packages/domain-model/src/repositories/signal-candidate-repository.impl.ts`)
- `InMemoryEvaluationResultRepository` (`packages/domain-model/src/repositories/evaluation-result-repository.impl.ts`)
- `InMemorySetupAggregateResultRepository` (`packages/domain-model/src/repositories/setup-aggregate-result-repository.impl.ts`)
- `InMemoryResearchFeedbackDecisionRepository` (`packages/domain-model/src/repositories/research-feedback-decision-repository.impl.ts`)
- `InMemoryResearchDecisionApprovalRepository` (`packages/domain-model/src/repositories/research-decision-approval-repository.impl.ts`)
- `RelationalSetupDefinitionRepository` (`packages/domain-model/src/repositories/setup-definition-relational-repository.impl.ts`)
- `RelationalResearchHypothesisRepository` (`packages/domain-model/src/repositories/research-hypothesis-relational-repository.impl.ts`)
- `RelationalSignalCandidateRepository` (`packages/domain-model/src/repositories/signal-candidate-relational-repository.impl.ts`)
- `RelationalEvaluationResultRepository` (`packages/domain-model/src/repositories/evaluation-result-relational-repository.impl.ts`)
- `RelationalSetupAggregateResultRepository` (`packages/domain-model/src/repositories/setup-aggregate-result-relational-repository.impl.ts`)
- `RelationalResearchFeedbackDecisionRepository` (`packages/domain-model/src/repositories/research-feedback-decision-relational-repository.impl.ts`)
- `RelationalResearchDecisionApprovalRepository` (`packages/domain-model/src/repositories/research-decision-approval-relational-repository.impl.ts`)
- shared implemented-product composition (`packages/domain-model/src/repositories/implemented-product-relational-repositories.ts`)

Repository responsibilities:
- persist and load domain-shaped records
- enforce identity/version expectations at boundary level
- isolate persistence details from application services

Repository non-goals:
- no orchestration workflow control
- no domain orchestration logic
- no scoring/analytics behavior

## Service boundaries
Service interfaces are defined in `packages/domain-model/src/services/*`.

Service layer:
- `MonitoringCatalogService`
- `SetupDefinitionService`
- `SignalCandidateService`
- `EvaluationService`
- `ResearchService`
- `ResearchAggregationService`

Implemented concrete service factories in the current baseline:
- `createSetupDefinitionService` (`packages/domain-model/src/services/setup-definition-service.ts`)
- `createResearchService` (`packages/domain-model/src/services/research-service.ts`)
- `createSignalCandidateService` (`packages/domain-model/src/services/signal-candidate-service.ts`)
- `createEvaluationService` (`packages/domain-model/src/services/evaluation-service.ts`)
- `createResearchAggregationService` (`packages/domain-model/src/services/research-aggregation-service.ts`)

Service responsibilities:
- own write-path semantics
- coordinate repository calls
- enforce application-level boundary rules

First persisted slice write-path rules now implemented:
- `SetupDefinitionService`
  - validates required setup fields (`id`, `name`, `description`, `measurableConditions`, `status`)
  - controls activation/archive transitions
  - rejects status changes through generic update path
- `ResearchService`
  - validates required hypothesis fields (`id`, `title`, `description`, `assumptions`, `status`)
  - validates referenced setup definition ids before create/update/link
  - controls hypothesis status transitions
  - owns controlled setup linkage for hypotheses
  - records `ResearchFeedbackDecision` recommendations from hypothesis evidence and owns decision-status review updates
  - records `ResearchDecisionApproval` artifacts from manual review outcomes
- `SignalCandidateService`
  - validates required fields (`id`, `setupDefinitionId`, `monitoredSymbolId`, `detectedAt`, `status`, `evidenceSummary`)
  - validates referenced setup definition and monitored symbol boundaries
  - enforces strict candidate lifecycle transitions before evaluation
- `EvaluationService`
  - validates required fields (`id`, `signalCandidateId`, `evaluationWindowId`, `status`)
  - validates referenced signal candidate existence
  - enforces strict evaluation lifecycle transitions
  - validates completed metrics consistency and duplicate candidate/window prevention
- `ResearchAggregationService`
  - validates aggregate references (`setupDefinitionId`, optional `researchHypothesisId`)
  - validates setup/scope uniqueness
  - recomputes minimum aggregate evidence from evaluation results
  - enforces aggregate lifecycle transitions (`pending`, `completed`, `partial`, `invalid`)

Service non-goals:
- no direct runner-artifact writes
- no DB implementation details
- no runtime ingestion/detection/evaluation engines in this slice

## Write-path ownership
Write ownership is explicit in:
- `packages/domain-model/src/services/service-boundary.ts`

Ownership direction:
- `monitored_symbol` -> `monitoring_catalog_service`
- `setup_definition` -> `setup_definition_service`
- `signal_candidate` -> `signal_candidate_service`
- `evaluation_result` -> `evaluation_service`
- `research_hypothesis` -> `research_service`
- `setup_aggregate_result` -> `research_aggregation_service`
- `research_feedback_decision` -> `research_service`
- `research_decision_approval` -> `research_service`

## Mapping rules
1. repositories return domain-shaped records (not runner artifact shapes)
2. persistence metadata (`originRunId`, `traceId`) may be attached through metadata contracts
3. runtime evidence files remain separate from product-domain storage
4. one domain contract does not force one-table implementation in this slice
5. implemented persistence is now narrow but end-to-end for setup definitions, research hypotheses, signal candidates, evaluation results, setup aggregate results, research feedback decisions, and research decision approvals

## Orchestrator handoff boundary
- orchestrator workflows may trigger future product-domain services
- product persistence side effects should happen only through explicit service/repository boundaries
- `runtime/runs/*` remains orchestration evidence, not product source of truth

## Related contract source
- `packages/domain-model/src/storage/first-durable-relational-slice.ts`
- `packages/domain-model/src/storage/research-feedback-decision-relational-slice.ts`
- `packages/domain-model/src/storage/research-feedback-decision-relational-physical-schema.ts`
- `packages/domain-model/src/storage/research-decision-approval-relational-slice.ts`
- `packages/domain-model/src/storage/research-decision-approval-relational-physical-schema.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-repositories.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-prisma-client.ts`
- `packages/domain-model/src/repositories/first-durable-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/first-durable-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/research-feedback-decision-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/research-feedback-decision-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/repository-error.ts`
