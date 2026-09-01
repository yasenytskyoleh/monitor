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
- `telegram_timeout`
- `telegram_notification_invalid`

It reads only Telegram's boolean response `ok` marker, then discards the response body without
logging or retaining it. The sent text includes the observed price and historical evidence, states
that it is decision support rather than financial advice, and explicitly states that no order was
placed.

The caller must configure a positive request timeout. The adapter aborts the request at that bound
and returns `telegram_timeout`; it does not retry the potentially ambiguous send.

There is still no scheduler, provider retry, exchange access, or automatic trading. A caller must
claim a retained notification, invoke the port, and record the returned outcome through the
existing delivery service. If the process fails before it records an outcome, a bounded
reconciliation runner can later terminalize only a stale claimed record as
`delivery_outcome_unconfirmed`; it must not retry or resend it.

`createPatternNotificationDeliveryWorkflow` provides that claim → Telegram → record composition
for one caller invocation. It gives every claim a durable owner lease from the workflow clock;
the lease must cover the adapter's bounded Telegram execution time plus a positive
terminal-recording grace, and the same owner ID is presented for the terminal write. It returns an
explicit `outcome_unconfirmed` result if the port or terminal write fails, leaving the record for
reconciliation rather than attempting a second send.

`createPatternNotificationDeliveryDispatch` can invoke this workflow for a bounded set of pending
records. Its caller supplies the cadence policy; the dispatch has no background timer or retry
path. `createPatternNotificationDeliveryReconciliationRunner` separately processes a bounded set
of claimed records. It waits for the persisted lease expiry plus a configured clock-skew tolerance,
then can only terminalize an unconfirmed attempt; it never invokes Telegram.

The delivery service stores each workflow lease ID and expiry for a claimed attempt. Reconciliation
uses that durable evidence to resolve an unconfirmed result without resending the Telegram alert.
