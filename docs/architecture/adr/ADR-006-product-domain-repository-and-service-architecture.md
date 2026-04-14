# ADR-006: Product-Domain Repository and Service Architecture

## Status
Accepted — 2026-04-14

## Context
After ADR-005, storage boundaries and persisted entity direction were defined, but implementation-layer boundaries were still missing.

Without repository and service contracts, product-domain writes risk becoming ad hoc and leaking into orchestrator runtime paths.

## Decision
Introduce first implementation-architecture contracts:
- repository interfaces for persisted product entities
- service interfaces for write-path ownership and application-level orchestration
- explicit write ownership map per persisted entity type

Initial repository set:
- `MonitoredSymbolRepository`
- `SetupDefinitionRepository`
- `SignalCandidateRepository`
- `EvaluationResultRepository`
- `ResearchHypothesisRepository`
- `SetupAggregateResultRepository`

Initial service set:
- `MonitoringCatalogService`
- `SetupDefinitionService`
- `SignalCandidateService`
- `EvaluationService`
- `ResearchService`

First persisted implementation candidate slice:
- `SetupDefinition`
- `ResearchHypothesis`

## Consequences

### Positive
- write ownership is explicit and auditable
- repository contracts isolate future DB details from service semantics
- first implementation slice is narrow and product-meaningful

### Tradeoffs
- no concrete persistence behavior yet
- additional contract iteration may be needed before schema design stabilizes

## Explicitly postponed
- Prisma schema and DB migrations
- concrete repository implementations
- service runtime implementations
- runtime ingestion/detection/evaluation/aggregation engines

## Guardrails
- runtime evidence storage remains separate from product persistence
- repositories must expose domain-shaped records
- persistence side effects should flow only through service/repository boundaries
