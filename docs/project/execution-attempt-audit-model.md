# Execution Attempt Audit Model

## Purpose

Define the selected product-domain audit record for retained downstream execution attempts.

## Ownership and boundary

The downstream execution runtime creates and terminalizes attempts. The domain-model persistence
layer retains a sanitized audit record. This entity does not execute a command, schedule retries,
or replace runtime evidence.

## Proposed v1 contract

`ExecutionAttemptAudit` has:

- `attemptId` as its stable product identity
- optional `routedActionExecutionEnvelopeId`, `reviewDecisionRoutingResultId`, and
  `researchReviewDecisionId` for correlation when source context exists
- `actionTarget` and `downstreamCommandType` snapshots
- status lifecycle: `received` → `executed` | `rejected` | `failed`
- `attemptedAt`, optional `completedAt`, actor/source identifiers, and product metadata
- sanitized `outcomeCode`, optional `outcomeSummary`, and warning identifiers
- optimistic versioning and append-only terminal evidence semantics

## Evidence and retention

The audit record retains product-level correlation and outcome summaries for the product-audit
lifetime. It must not include raw command inputs, credentials, provider response bodies, stack
traces, or runtime logs. Those artifacts belong to runtime evidence and are linked only through
safe external identifiers if needed later.

## Persistence sequence

1. add the domain contract and in-memory repository/service path
2. define the durable relational record and Prisma migration
3. add adapter, mapper, shared composition, and real-Postgres coverage
4. integrate only after an execution runtime explicitly owns attempt creation
