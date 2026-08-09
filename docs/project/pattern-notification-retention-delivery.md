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

An attempted notification has no automatic retry path. This prevents duplicate user alerts after
a crash or ambiguous provider response; reconciliation is an explicit future workflow.

## Provider boundary

`PatternNotificationDeliveryPort` defines a provider-neutral request/outcome contract. It carries
the retained decision-support notification and returns only `delivered`/`failed`, a completion
time, and stable outcome code. It intentionally has no provider implementation,
recipient configuration, provider payload persistence, scheduler, queue, exchange access, or
order placement.

`consider_long` remains decision-support language based only on the currently implemented bullish
evidence. It is not a buy instruction or automated trade.
