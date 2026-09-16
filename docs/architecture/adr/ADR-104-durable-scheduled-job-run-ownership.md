# ADR-104: Durable Scheduled Job Run Ownership

## Context

The BTC evaluator and notification dispatcher are bounded and idempotent, but their in-process cadence
guards cannot prevent two cron or container invocations from overlapping. Scheduler mechanics are
operational state and must not be represented as product or research records.

## Decision

Add a `runtime_control` PostgreSQL schema and a `scheduled_job_run` record with durable run history.
Use database-time renewable leases, a partial unique index for one running owner per job scope, and
owner-fenced renewal and terminal transitions. Evaluation is scoped by setup and symbol. The existing
reconciliation-before-delivery notification command uses one global scope.

Cadence remains externally owned. Lease duration is 120 seconds and heartbeat cadence is 30 seconds.
Expired owners are marked `abandoned` by the next successful acquisition. Summaries retain counts only.

## Consequences

- concurrent bounded invocations skip before business work
- crashes become recoverable without deleting run evidence
- stale owners cannot renew or terminalize after takeover
- operational records remain separate from `product_domain`
- there is still no scheduler daemon, queue, provider retry, automatic resend, or trading path
