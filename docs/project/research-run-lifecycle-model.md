# Research Run Lifecycle Model

## Purpose

Define the service-owned write path for durable research runs.

## Service

`createResearchRunService` exposes:

- `createPlannedResearchRun`
- `startResearchRun`
- `completeResearchRun`
- `failResearchRun`
- `cancelResearchRun`

Planned runs validate their hypothesis/setup linkage and every optional candidate, evaluation
window, and evaluation-result reference. Start is allowed only from `planned`; completion,
failure, and cancellation are allowed only from non-terminal states. Completion retains its
explicit timestamp while all changes use the repository's optimistic-version contract.

## Boundaries

The service does not allocate work, run evaluations, or invoke aggregation. Those remain
separate runtime and aggregation responsibilities.
