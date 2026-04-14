# Chat Briefing

## Reusable project briefing
I am working on **Monitor**, a monorepo TypeScript project that combines:
- a controlled agent orchestration foundation, and
- an initial product-domain contracts slice for monitoring/research.

Current foundation scope includes:
- docs + configs + schemas + runtime guardrails
- orchestrated workflow execution with approvals and artifact enforcement
- constrained backend live mode with isolated apply/verify/rollback/promotion

Current product-domain scope includes:
- `packages/domain-model` with:
  - `MonitoredSymbol`
  - `SetupDefinition`
  - `SignalCandidate`
  - `EvaluationWindow`
  - `EvaluationResult`
  - `ResearchHypothesis`
  - `ResearchRun`
- docs:
  - `docs/project/domain-model.md`
  - `docs/project/research-model.md`
  - `docs/architecture/adr/ADR-001-first-product-domain-slice.md`

The current workflow states are:
- `INTAKE`
- `DESIGN`
- `FORMALIZE`
- `IMPLEMENT`
- `REVIEW`
- `APPROVAL`
- `PUBLISH_SIGNAL`
- `DONE`
- `REJECTED`

## Current constraints
- spot-only scope
- no automated trading logic
- no futures/leverage funding logic
- no exchange ingestion implementation yet
- no statistics engine implementation yet
- no UI/dashboard implementation yet

## Recommended next step
- define monitoring ingestion architecture against the existing product-domain contracts (no full implementation yet)

## Behavioral instructions for future assistants
When continuing this project:
1. preserve orchestration safety constraints while product-domain implementation starts
2. keep orchestration-domain and product-domain boundaries explicit
3. prioritize consistency between docs, contracts, config, schemas, and runtime behavior
4. prefer small, explicit, reviewable PR-sized steps
5. avoid unrelated “AI trading bot” scope expansion
