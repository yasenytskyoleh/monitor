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
candidate and evaluation-window context from terminal result identifiers. Start is allowed only
from `planned`; evidence recording is allowed from `planned` or `running`, while completion is
allowed only from `running`. Failure and cancellation are allowed only from non-terminal states.
Completion retains its explicit timestamp while all changes use the repository's
optimistic-version contract.

Evaluation evidence must be terminal (`completed`, `expired`, or `invalidated`) before it can be
included in a ResearchRun, either at creation or through evidence recording.

## Application flow

`SetupToAggregateFlow` accepts an optional run input. When present, it creates and starts the
run after candidate creation, records the terminal evaluation result, completes the run, and
then performs run-scoped aggregation. Existing callers can omit the run input and retain the
original setup-to-aggregate sequence. `createSetupToAggregateFlowFromRepositories` composes the
flow's services from the existing repository contracts so an implemented-product relational
repository bundle can enable the lifecycle without manually wiring its dependencies.

The evaluation phase accepts a completed, expired, or invalidated terminal outcome. Each is
recorded as terminal run evidence before aggregation; a run containing no usable completed
evaluation produces an `invalid` aggregate rather than a failed workflow.

Flow results include the terminal evaluation, ResearchRun, and aggregate statuses when those
operations complete, allowing callers to distinguish a completed workflow from a completed
research outcome.

The flow can also register the candidate's monitored symbol when supplied in its optional input;
otherwise it retains the existing requirement that the candidate's symbol is already catalogued.

The environment-gated real-Postgres integration suite runs this repository-composed flow for all
terminal evaluation outcomes and verifies the completed ResearchRun row and its run-scoped
aggregate after persistence.

## Boundaries

The service does not allocate work, run evaluations, or invoke aggregation. Those remain
separate runtime and aggregation responsibilities.
