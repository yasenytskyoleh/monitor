# ADR-092: Research Run Lifecycle Service

## Context

`ResearchRun` now has durable repository support and aggregation can validate run-scoped
evidence. Its planned, running, completed, failed, and cancelled states still needed one
service-owned write path so callers cannot freely bypass reference checks or terminal-state
rules.

## Decision

Add `ResearchRunService` with five explicit operations:

- create a planned run after validating hypothesis, setup, candidate, evaluation-window, and
  evaluation-result context
- start a planned run
- complete a running run with a completion timestamp and optional summary
- fail or cancel a planned/running run with an optional summary

The service forwards expected-version values to the repository and rejects transitions from
terminal states. It owns lifecycle validation only; it does not schedule evaluation work or
execute aggregation jobs.

## Consequences

- research-run writes have a clear product-domain owner
- service callers receive deterministic validation before persistence
- runtime execution and job orchestration remain separate concerns
