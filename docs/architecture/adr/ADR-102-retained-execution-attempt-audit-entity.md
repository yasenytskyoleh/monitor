# ADR-102: Retained Execution-Attempt Audit Entity

## Context

`RoutedActionExecutionResult` remains intentionally ephemeral because rejected and failed
responses do not always have stable product identifiers. Product audit requirements nevertheless
need a durable record of a downstream execution attempt once an execution runtime is introduced.

## Decision

Introduce a future `ExecutionAttemptAudit` product entity rather than persisting the response
type. The execution runtime owns creation and terminalization; product persistence owns the
durable audit record.

The v1 contract will include:

- stable `attemptId`, attempt timestamps, and a received-to-terminal lifecycle
- optional references to execution envelope, routing result, and review decision
- action target and command type snapshots sufficient for audit correlation
- terminal `executed`, `rejected`, or `failed` outcome and a sanitized outcome code/summary
- product metadata and optimistic versioning

The audit record must not retain raw execution payloads, credentials, provider responses, stack
traces, or runtime logs. Those remain runtime evidence under their own retention policy.

## Consequences

- rejected attempts can be retained without inventing incomplete envelope records
- execution preparation responses remain ephemeral and backward-compatible
- v1 retention is product-audit lifetime; deletion and archival workflows require a later policy
- no execution engine, retry behavior, or trading action is introduced by this decision
