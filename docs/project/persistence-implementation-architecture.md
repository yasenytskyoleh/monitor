# Persistence Implementation Architecture

## Purpose
Define the first implementation architecture for product-domain persistence without introducing DB runtime code.

This slice introduces repository and service boundaries only.

## Repository boundaries
Repository interfaces are defined in `packages/domain-model/src/repositories/*`.

Planned first repository abstractions:
- `MonitoredSymbolRepository`
- `SetupDefinitionRepository`
- `SignalCandidateRepository`
- `EvaluationResultRepository`
- `ResearchHypothesisRepository`
- `SetupAggregateResultRepository`

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

Service responsibilities:
- own write-path semantics
- coordinate repository calls
- enforce application-level boundary rules

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
- `setup_aggregate_result` -> `research_service`

## Mapping rules
1. repositories return domain-shaped records (not runner artifact shapes)
2. persistence metadata (`originRunId`, `traceId`) may be attached through metadata contracts
3. runtime evidence files remain separate from product-domain storage
4. one domain contract does not force one-table implementation in this slice

## Orchestrator handoff boundary
- orchestrator workflows may trigger future product-domain services
- product persistence side effects should happen only through explicit service/repository boundaries
- `runtime/runs/*` remains orchestration evidence, not product source of truth
