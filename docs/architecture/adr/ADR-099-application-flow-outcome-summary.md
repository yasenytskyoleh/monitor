# ADR-099: Application Flow Outcome Summary

## Context

The setup-to-aggregate flow reports execution status and durable IDs. A caller cannot determine
from that result whether a successfully executed flow produced a completed or invalid aggregate
without loading the persisted records again.

## Decision

Return an optional outcome summary with the terminal evaluation, ResearchRun, and aggregate
statuses. The summary is populated when the corresponding operation completes and accompanies
completed and partial flow results.

## Consequences

- callers can distinguish operational success from the resulting research outcome in one response
- existing result consumers remain compatible because the summary is additive and optional
- failed flows still rely on completed steps and durable IDs to describe the point of failure
