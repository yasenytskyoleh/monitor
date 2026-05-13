# Storage Architecture

## Purpose
Define the first persistence architecture for Monitor product-domain entities while preserving strict separation from orchestrator runtime evidence.

This slice now includes storage boundaries, logical persistence contracts, and first physical schema artifacts. It still does not implement relational repositories/adapters or live database writes.

## Storage layers

### Layer A — Orchestrator runtime storage
Purpose:
- immutable/append-style workflow evidence for orchestration execution

Current direction:
- filesystem-backed runtime artifacts under `runtime/runs/*`

Examples:
- `run.json`
- `transitions.json`
- `approvals.json`
- `artifacts.json`
- backend execution evidence (`patch`, `verification`, `rollback`, `promotion`)

### Layer B — Product-domain storage
Purpose:
- first-class persisted product records

Current direction:
- implemented in-memory persistence exists today
- first physical PostgreSQL + Prisma schema artifacts now exist for the first durable slice
- adapter-backed relational repositories now exist for the first durable slice
- concrete Prisma adapter and runtime DB wiring remain pending

First-class persisted entities:
- `MonitoredSymbol`
- `SetupDefinition`
- `SignalCandidate`
- `EvaluationResult`
- `ResearchHypothesis`
- `SetupAggregateResult`

### Layer C — Derived/analytics storage
Purpose:
- derived outputs and materializations for later research/scoring surfaces

Status:
- postponed (no implementation in this slice)

Examples:
- scoring caches
- ranking materializations
- precomputed comparison summaries

## Boundary rules
1. runtime evidence and product-domain records must remain separate storage layers
2. product records may carry trace metadata (for example `originRunId`) but are not stored inside runtime evidence folders
3. derived analytics outputs must not be treated as source-of-truth product records

## Technology direction
- runtime evidence: file-based artifacts (already implemented)
- product domain: implemented in-memory persistence plus committed first physical PostgreSQL + Prisma schema artifacts
- derived analytics: deferred until aggregation/scoring architecture matures

## Implementation-architecture boundary
- repository contracts own persistence abstraction (`packages/domain-model/src/repositories/*`)
- service contracts own write-path semantics (`packages/domain-model/src/services/*`)
- orchestrator runtime components should call product-domain services, not write product records directly

## Contract source
- `packages/domain-model/src/storage/*`
- `docs/project/durable-relational-persistence-model.md`
- `docs/project/relational-adapter-rollout-model.md`
- `docs/project/prisma-schema-implementation-model.md`
