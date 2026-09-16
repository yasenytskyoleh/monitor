# Scheduled Job Run Ownership

## Purpose

Prevent concurrent cross-process execution of bounded BTC jobs while retaining compact operational
evidence. Cadence remains external; this boundary does not create timers, queues, retries, or trading.

## Ownership model

`runtime_control.scheduled_job_run` stores one row per invocation. A partial unique index permits at
most one `running` row for a job name and scope. Acquisition uses database time and one atomic write:
an unexpired owner causes a normal skip, while an expired owner is terminalized as `abandoned` before
the replacement run is created.

Running jobs renew a 120-second lease every 30 seconds. Renewal and terminal writes require the
matching run ID, owner ID, running state, and unexpired lease. If ownership becomes uncertain, the
worker stops starting new bounded items and exits non-zero. The next invocation can recover after
expiry without allowing the stale owner to overwrite terminal evidence.

## BTC scopes and evidence

- `btc_evaluate` is scoped by setup definition and monitored symbol.
- `btc_notify` is global because reconciliation and pending-delivery selection use one shared set.
- notification reconciliation remains the first phase of the composite notification command.
- successful overlap skips are structured operational outcomes, not errors.
- persisted summaries contain status counts only; item IDs, credentials, recipient data, and provider
  bodies are not retained.

The per-notification delivery lease remains authoritative for Telegram's at-most-once side effect.
Scheduled-job ownership does not weaken or replace that lease.
