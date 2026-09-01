# Pattern-notification retention and delivery boundary

`@monitor/pattern-notification` now retains an eligible notification as an immutable
`PatternNotificationRecord`. The PostgreSQL/Prisma record has a unique `deduplicationKey`, so one
signal candidate can create at most one retained decision-support notification.

## Retained evidence

The retained record preserves the exact live observation, policy ID, and historical aggregate
metrics that made the notification eligible. These evidence fields cannot change after creation;
only delivery state and its stable outcome evidence can change.

The service-owned state transition is deliberately narrow:

1. `pending_delivery` — the eligible snapshot was retained.
2. `delivery_attempted` — one caller claimed the delivery attempt.
3. `delivered` or `failed` — the caller recorded a machine-readable outcome code.

An attempted notification has no automatic retry path. A caller may reconcile a claimed attempt
only after its configured minimum age, which terminalizes it as `failed` with
`delivery_outcome_unconfirmed`. Reconciliation never re-queues or resends the alert, preserving
the at-most-once user-alert guarantee after a crash or ambiguous provider response.

## Provider boundary

`PatternNotificationDeliveryPort` defines a provider-neutral request/outcome contract. It carries
the retained decision-support notification and returns only `delivered`/`failed`, a completion
time, and stable outcome code. Telegram is now the first explicit adapter, but recipient
configuration and provider response bodies remain outside durable product storage. There is still
no scheduler, queue, exchange access, or order placement.

`createPatternNotificationDeliveryWorkflow` is the explicit caller composition: it claims the
record, invokes one delivery port only after that claim, then records the port's terminal outcome.
If delivery or outcome recording does not complete, it leaves the one claimed record unresolved
for the no-resend reconciliation path. It does not schedule or retry work itself.

`consider_long` remains decision-support language based only on the currently implemented bullish
evidence. It is not a buy instruction or automated trade.
