# Persistence Implementation Architecture

## Purpose
Define the first implementation architecture for product-domain persistence without introducing DB runtime code.

This document now reflects both:
- boundary contracts
- first concrete implementation for the initial persisted product slice

## Repository boundaries
Repository interfaces are defined in `packages/domain-model/src/repositories/*`.

Repository abstractions:
- `MonitoredSymbolRepository`
- `SetupDefinitionRepository`
- `SignalCandidateRepository`
- `EvaluationResultRepository`
- `ResearchHypothesisRepository`
- `SetupAggregateResultRepository`

Implemented concrete repositories in this PR:
- `InMemorySetupDefinitionRepository` (`packages/domain-model/src/repositories/setup-definition-repository.impl.ts`)
- `InMemoryResearchHypothesisRepository` (`packages/domain-model/src/repositories/research-hypothesis-repository.impl.ts`)
- `InMemorySignalCandidateRepository` (`packages/domain-model/src/repositories/signal-candidate-repository.impl.ts`)
- `InMemoryEvaluationResultRepository` (`packages/domain-model/src/repositories/evaluation-result-repository.impl.ts`)
- `InMemorySetupAggregateResultRepository` (`packages/domain-model/src/repositories/setup-aggregate-result-repository.impl.ts`)

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

Implemented concrete service factories in this PR:
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

## Mapping rules
1. repositories return domain-shaped records (not runner artifact shapes)
2. persistence metadata (`originRunId`, `traceId`) may be attached through metadata contracts
3. runtime evidence files remain separate from product-domain storage
4. one domain contract does not force one-table implementation in this slice
5. implemented persistence is now narrow but end-to-end for setup definitions, research hypotheses, signal candidates, evaluation results, and setup aggregate results

## Orchestrator handoff boundary
- orchestrator workflows may trigger future product-domain services
- product persistence side effects should happen only through explicit service/repository boundaries
- `runtime/runs/*` remains orchestration evidence, not product source of truth
