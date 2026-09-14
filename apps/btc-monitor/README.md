# BTC monitor

This is a read-only BTC/USDT monitoring process. It warms a five-minute closed-candle detector from Binance Spot history, follows closed candles over WebSocket, validates the configured active setup revision, and persists detected signal candidates in Postgres.

It does not trade and does not make an investment recommendation. A detected candidate is an input to the historical evaluation workflow. A fresh signal is retained as a pending decision-support notification only after the configured historical evidence policy passes; delivery is a separate, explicit command.

It requires Node.js 22 or newer for the native WebSocket client.

## Containerized pilot

Run `pnpm btc-pilot` from the repository root for a bounded real-data check. It builds the runtime
image, starts Postgres, deploys migrations, seeds the canonical BTC setup, processes the Binance
backfill, observes the next live closed candle, and exits with a JSON summary. A successful smoke
run does not require a breakout to occur.

Start the long-running container with `pnpm btc-monitor:docker`. Stop it and the local database with
`pnpm btc-pilot:down`; the database volume is retained.

## Host start

1. Start Postgres and apply the domain migrations.
2. Run `pnpm btc-seed` to create or validate the canonical active symbol, setup, revision, and activation.
3. Add any desired overrides to `.env`.
4. Run `pnpm btc-monitor` from the repository root.

The process logs JSON records for startup, detected/rejected/failed outcomes, and feed errors. Stop it with `SIGINT` or `SIGTERM`; it drains the market-data feed before disconnecting from Postgres.

## Evaluate historical outcomes

Run `pnpm btc-evaluate` from the repository root as a bounded job of up to 50 candidates. It only considers candidates
for this monitor's configured setup and symbol after their complete 24-hour observation window has
closed. The job reconstructs the exact closed-candle window from Binance, persists the evaluation,
and refreshes the setup's historical aggregate. It does not send notifications; that remains gated
on the aggregate meeting a separately configured decision-support policy.

## Deliver retained notifications

Run `pnpm btc-notify` to deliver up to 10 pending notifications through Telegram. This is an opt-in,
one-shot job: it only sends retained decision-support alerts and records each provider outcome before it
exits. It never places an order. The command requires `BTC_MONITOR_TELEGRAM_BOT_TOKEN` and
`BTC_MONITOR_TELEGRAM_CHAT_ID`; those values are used only for the Telegram request and are never
written to its JSON logs.

## Notification retention policy

For every freshly persisted detection, the monitor looks up the exact aggregate for that candidate's
setup definition, `BTC-USDT`, and `window-24h`. It retains a durable `pending_delivery` notification
only when the candidate and aggregate satisfy the policy below. Retention is deduplicated by signal
candidate; no delivery is attempted in this process.

Default policy: 30 completed evaluations, at least 60% positive outcomes, average move of at least
0.5%, a signal no older than 15 minutes, and an aggregate computed within 24 hours. These are
conservative decision-support filters, not investment advice.

## Configuration

| Variable | Required | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string for product persistence. |
| `BTC_MONITOR_SETUP_DEFINITION_ID` | no | Active setup definition to evaluate; defaults to `setup-btc-breakout`. |
| `BTC_MONITOR_MONITORED_SYMBOL_ID` | no | Canonical monitored symbol; defaults to `BTC-USDT`. |
| `BTC_MONITOR_BACKFILL_HOURS` | no | Historical warm-up window, from 1 to 720 hours; defaults to 24. |
| `BTC_MONITOR_SMOKE_TIMEOUT_SECONDS` | no | Live-candle wait for `btc-smoke`, from 1 to 300 seconds; defaults to 90. |
| `BTC_MONITOR_DATABASE_SCHEMA` | no | Overrides the default `product_domain` schema. |
| `BTC_MONITOR_NOTIFICATION_POLICY_ID` | no | Evidence-policy label stored with retained notifications; defaults to `btc-breakout-conservative-v1`. |
| `BTC_MONITOR_NOTIFICATION_MIN_COMPLETED_EVALUATIONS` | no | Minimum completed 24-hour evaluations; defaults to 30. |
| `BTC_MONITOR_NOTIFICATION_MIN_POSITIVE_OUTCOME_RATE` | no | Minimum positive-outcome ratio from 0 to 1; defaults to 0.6. |
| `BTC_MONITOR_NOTIFICATION_MIN_AVERAGE_PERCENTAGE_MOVE` | no | Minimum average 24-hour move percentage; defaults to 0.5. |
| `BTC_MONITOR_NOTIFICATION_MAX_SIGNAL_AGE_MINUTES` | no | Freshness limit for the detected signal; defaults to 15. |
| `BTC_MONITOR_NOTIFICATION_MAX_AGGREGATE_AGE_HOURS` | no | Freshness limit for historical evidence; defaults to 24. |
| `BTC_MONITOR_TELEGRAM_BOT_TOKEN` | `btc-notify` only | Telegram bot token for delivery; never logged. |
| `BTC_MONITOR_TELEGRAM_CHAT_ID` | `btc-notify` only | Telegram chat ID for delivery; never logged. |
| `BTC_MONITOR_NOTIFICATION_MAX_DELIVERIES` | no | Maximum pending Telegram alerts sent per `btc-notify` run, from 1 to 100; defaults to 10. |
| `BTC_MONITOR_TELEGRAM_TIMEOUT_MS` | no | Per-request Telegram timeout in milliseconds, from 1 to 60,000; defaults to 10,000. |

## Linux scheduling

Run `pnpm btc-monitor:docker` for the local supervised container. For a non-container Linux host,
run `pnpm btc-monitor` under a process supervisor such as systemd so the closed-candle feed restarts
after a reboot. Schedule the bounded jobs separately; they are idempotent and use durable records
and delivery leases.

```cron
*/5 * * * * cd /opt/monitor && /usr/bin/pnpm btc-evaluate >> /var/log/btc-evaluate.log 2>&1
*/5 * * * * cd /opt/monitor && /usr/bin/pnpm btc-notify >> /var/log/btc-notify.log 2>&1
```

Give the process environment the required database and monitor values. Only the `btc-notify` job
needs `BTC_MONITOR_TELEGRAM_BOT_TOKEN` and `BTC_MONITOR_TELEGRAM_CHAT_ID`; keep both in the host's
secret store or protected environment file. The notifier rejects stale alerts and reconciles an
interrupted attempt before it sends new pending notifications.
