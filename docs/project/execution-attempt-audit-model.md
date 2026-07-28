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
- at most one audit for each non-null `routedActionExecutionEnvelopeId`; audits without an
  envelope reference remain valid for incomplete source context
- `actionTarget` and `downstreamCommandType` snapshots
- status lifecycle: `received` → `executed` | `rejected` | `failed`
- `attemptedAt`, optional `completedAt`, and `attemptedBy`; product metadata is added by the
  persistence layer
- once received, its envelope/routing/review references, action snapshot, actor, receipt time, and
  creation timestamp are immutable; terminalization adds only terminal outcome evidence
- sanitized `outcomeCode`, optional `outcomeSummary`, and warning identifiers; codes and warnings
  use lowercase underscore-delimited machine identifiers
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

The generic executor contract carries outcome codes and warning identifiers only; it does not
transport executor-provided text summaries into retained audit records. Its codes use lowercase
underscore-delimited machine identifiers.

If audit persistence fails, the runtime surfaces a safe phase-specific reconciliation error rather
than misclassifying the external outcome as an executor failure. A received-audit failure prevents
dispatch entirely. A duplicate received audit produces the non-retryable
`ExecutionAttemptRuntimeAuditAlreadyRecordedError` and also prevents dispatch, so a prepared
envelope can reach the injected executor at most once. Its `conflictKind` distinguishes a
duplicate `attempt_id` from a `prepared_envelope` conflict. The latter includes the prepared
envelope ID for `executionAttemptAuditRepository.getByRoutedActionExecutionEnvelopeId`; both
variants include the retained audit's `existingAttemptId`.

Concrete provider executors, retries, scheduling, and trading actions remain out of scope.
