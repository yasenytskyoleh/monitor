# Research Run Lifecycle Model

## Purpose

Define the service-owned write path for durable research runs.

## Service

`createResearchRunService` exposes:

- `createPlannedResearchRun`
- `startResearchRun`
- `recordResearchRunEvaluationResults`
- `completeResearchRun`
- `failResearchRun`
- `cancelResearchRun`

Planned runs validate their hypothesis/setup linkage and every optional candidate, evaluation
window, and evaluation-result reference. `recordResearchRunEvaluationResults` derives verified
candidate and evaluation-window context from finalized result identifiers. Start is allowed only
from `planned`; evidence recording is allowed from `planned` or `running`, while completion is
allowed only from `running`. Failure and cancellation are allowed only from non-terminal states.
Completion retains its explicit timestamp while all changes use the repository's
optimistic-version contract.

## Application flow

`SetupToAggregateFlow` accepts an optional run input. When present, it creates and starts the
run after candidate creation, records the finalized evaluation result, completes the run, and
then performs run-scoped aggregation. Existing callers can omit the run input and retain the
original setup-to-aggregate sequence.

## Boundaries

The service does not allocate work, run evaluations, or invoke aggregation. Those remain
separate runtime and aggregation responsibilities.
