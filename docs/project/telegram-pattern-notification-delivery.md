# Telegram pattern-notification delivery

The first configured notification channel is Telegram. `@monitor/pattern-notification` exposes a
`createTelegramPatternNotificationDeliveryPort` adapter that implements the provider-neutral
delivery port using Telegram's `sendMessage` endpoint and native `fetch`.

## Configuration

The caller supplies a Telegram bot token and a recipient chat ID at runtime. Neither value is
persisted in the product-domain notification record, emitted in outcomes, or logged by the adapter.
The adapter sends only an explicitly claimed `delivery_attempted` notification.

## Outcome and safety semantics

The adapter returns only a completion timestamp and stable outcome code:

- `telegram_accepted`
- `telegram_http_<status>` or `telegram_http_failure`
- `telegram_rejected` or `telegram_response_invalid`
- `telegram_network_error`
- `telegram_notification_invalid`

It reads only Telegram's boolean response `ok` marker, then discards the response body without
logging or retaining it. The sent text includes the observed price and historical evidence, states
that it is decision support rather than financial advice, and explicitly states that no order was
placed.

There is still no scheduler, provider retry, reconciliation worker, exchange access, or automatic
trading. A caller must claim a retained notification, invoke the port, and record the returned
outcome through the existing delivery service. If the process fails before it records an outcome,
the caller can later terminalize only a stale claimed record as
`delivery_outcome_unconfirmed`; it must not retry or resend it.

`createPatternNotificationDeliveryWorkflow` provides that claim → Telegram → record composition
for one caller invocation. It returns an explicit `outcome_unconfirmed` result if the port or
terminal write fails, leaving the record for reconciliation rather than attempting a second send.

`createPatternNotificationDeliveryDispatch` can invoke this workflow for a bounded set of pending
records. Its caller supplies the cadence policy; the dispatch has no background timer or retry
path. It does not reconcile potentially in-flight Telegram requests until the delivery execution
has a durable lease or heartbeat.

The delivery service supports a durable lease ID and expiry for a claimed attempt. A future bounded
Telegram caller must acquire that lease and record its outcome with the same ID before automated
reconciliation can be enabled.
