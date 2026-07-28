# Execution Attempt Audit Model

## Purpose

Define the selected product-domain audit record for retained downstream execution attempts.

## Ownership and boundary

The downstream execution runtime creates and terminalizes attempts. The domain-model persistence
layer retains a sanitized audit record. This entity does not execute a command, schedule retries,
or replace runtime evidence.

## v1 contract

`ExecutionAttemptAudit` has:

- `attemptId` as its stable product identity
- optional `routedActionExecutionEnvelopeId`, `reviewDecisionRoutingResultId`, and
  `researchReviewDecisionId` for correlation when source context exists
- `actionTarget` and `downstreamCommandType` snapshots
- status lifecycle: `received` → `executed` | `rejected` | `failed`
- `attemptedAt`, optional `completedAt`, and `attemptedBy`; product metadata is added by the
  persistence layer
- sanitized `outcomeCode`, optional `outcomeSummary`, and warning identifiers
- optimistic versioning and append-only terminal evidence semantics

The domain contract is exported from
`packages/domain-model/src/execution/execution-attempt-audit.ts`. Product record metadata,
optimistic versioning, and append-only persistence semantics are introduced with the repository
and durable-record layers; they do not belong to the runtime-facing value shape.

## Evidence and retention

The audit record retains product-level correlation and outcome summaries for the product-audit
lifetime. It must not include raw command inputs, credentials, provider response bodies, stack
traces, or runtime logs. Those artifacts belong to runtime evidence and are linked only through
safe external identifiers if needed later.

## Persistence status

The domain contract, in-memory repository/service path, durable relational record, Prisma
migration, mapper, adapters, shared product composition, and real-Postgres coverage are complete.
The shared bundle is exposed through `executionAttemptAuditRepository`.

The generic execution runtime is complete. It accepts only prepared envelopes whose correlation
matches the audit snapshot, records the received attempt before dispatch, and terminalizes it with
the injected executor's sanitized outcome. An executor failure becomes the sanitized
`executor_failed` audit outcome; provider errors are not retained. Repository-backed composition is
available through `createExecutionAttemptRuntimeFromRepositories`.

Concrete provider executors, retries, scheduling, and trading actions remain out of scope.
