# ADR-097: Research Run Terminal Evaluation Evidence

## Context

ResearchRun evidence is intended to be the stable record used by run-scoped aggregation. The
recording operation previously accepted evaluations still pending or in progress, allowing a
caller outside the application flow to preserve unsettled evidence.

## Decision

Require every evaluation result included when creating or extending a ResearchRun to have a
terminal status: `completed`, `expired`, or `invalidated`.

## Consequences

- run evidence cannot be invalidated by a later evaluation transition
- incomplete evaluation work remains outside the durable ResearchRun evidence set
- expired and invalidated outcomes retain their lifecycle trace without being treated as
  completed outcomes
