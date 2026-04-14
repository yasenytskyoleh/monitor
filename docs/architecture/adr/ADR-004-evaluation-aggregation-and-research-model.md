# ADR-004: Evaluation Aggregation and Research Model

## Status
Accepted — 2026-04-14

## Context
After ADR-003, individual signal outcomes are structured, but setup-level evidence across many outcomes was not modeled.

Without aggregation contracts, research hypotheses cannot be linked to consistent evidence and setup comparison remains informal.

## Decision
Introduce the first research-evidence contracts:
- `AggregationScope`
- `ResearchAggregationInput`
- `AggregateMetrics`
- `SetupAggregateResult`
- `SetupComparison`
- `ResearchHypothesisEvidenceLink`

First scope:
- descriptive aggregation only
- minimum aggregate metrics only
- comparison contracts without ranking logic
- contracts/docs only (no aggregation runtime implementation)

## Consequences

### Positive
- evaluation outputs can now be grouped into setup-level evidence
- hypothesis updates can reference explicit evidence-link records
- future scoring/ranking layers can build on stable aggregate contracts

### Tradeoffs
- first metric set is intentionally narrow
- no statistical significance model in this slice
- comparison outputs are descriptive, not decision-automated

## Explicitly postponed
- aggregation job execution engine
- advanced quant metrics and significance testing
- setup ranking/scoring pipelines
- persistence and migration design

## Guardrails
- no runtime analytics engine in this ADR
- no DB migration work in this ADR
- no trading execution behavior in this ADR
