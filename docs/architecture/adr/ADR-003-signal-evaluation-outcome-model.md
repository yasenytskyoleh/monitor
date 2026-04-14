# ADR-003: Signal Evaluation Outcome Model

## Status
Accepted — 2026-04-14

## Context
After monitoring ingestion and normalized event contracts, the domain still needed explicit post-detection evaluation semantics.

Without this layer, the system can form `SignalCandidate` records but cannot produce structured outcomes for research comparison.

## Decision
Introduce a minimal evaluation contract model with:
- `EvaluationInput`
- `EvaluationWindow`
- `EvaluationResult`
- `EvaluationMetrics`
- explicit `EvaluationStatus`

First scope:
- time-based windows only
- minimum comparable outcome metrics only
- contracts/docs only (no runtime evaluation implementation)

## Consequences

### Positive
- post-detection lifecycle is explicitly modeled
- setup quality can later be evaluated from structured outcome records
- future statistics/scoring layers get a stable input contract

### Tradeoffs
- metrics are intentionally simple and may require extension later
- nullable first-version fields require explicit downstream handling

## Explicitly postponed
- replay/engine implementation
- persistent evaluation storage design
- aggregation/statistics/scoring systems
- ranking and reporting behavior

## Guardrails
- no ingestion runtime work in this ADR
- no DB migration work in this ADR
- no trading execution logic in this ADR

## Follow-up ADRs
- ADR-004 defines the first aggregation and setup-comparison evidence layer that consumes `EvaluationResult` records.
