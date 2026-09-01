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
