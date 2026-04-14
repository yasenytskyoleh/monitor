# ADR-001: First Product Domain Slice

## Status
Accepted — 2026-04-14

## Context
Monitor already has a working orchestration foundation:
- workflow states and transitions
- agent execution controls
- approval and artifact guardrails
- constrained backend apply/verify/rollback/promotion path

However, the project lacked an explicit product-domain model. Without explicit domain contracts, implementation would drift and orchestration concerns could leak into product semantics.

## Decision
Create the first product-side domain slice with docs-first contracts and minimal TypeScript skeletons.

Included entities:
- `MonitoredSymbol`
- `SetupDefinition`
- `SignalCandidate`
- `EvaluationWindow`
- `EvaluationResult`
- `ResearchHypothesis`
- `ResearchRun`

Package location:
- `packages/domain-model`

Primary docs:
- `docs/project/domain-model.md`
- `docs/project/research-model.md`

Boundary rule:
- orchestration domain controls process execution and safety constraints
- product domain controls market/setup/signal/evaluation semantics

## Consequences

### Positive
- product-side language is explicit and testable
- future ingestion/evaluation work can target stable contracts
- orchestration and product concerns are structurally separated
- future PRs can stay bounded to implementation against known contracts

### Tradeoffs
- initial contracts may require revision after first ingestion prototypes
- some fields are placeholders until storage and statistics architecture is selected

## Explicitly postponed
- exchange integration and live market ingestion
- evaluation/statistics engine implementation
- DB schema/migrations and persistence adapters
- execution/trading logic
- UI/dashboard features
- news/sentiment enrichment

## Guardrails
- no backend capability expansion in this ADR
- no cross-package architectural rewrite
- no implementation logic that infers product behavior beyond defined contracts
