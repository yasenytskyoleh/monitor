# BTC monitor

This is a read-only BTC/USDT monitoring process. It warms a five-minute closed-candle detector from Binance Spot history, follows closed candles over WebSocket, validates the configured active setup revision, and persists detected signal candidates in Postgres.

It does not trade and does not make an investment recommendation. A detected candidate is an input to the later evaluation and notification workflow.

It requires Node.js 22 or newer for the native WebSocket client.

## Start

1. Start Postgres and apply the domain migrations.
2. Create an active monitored symbol (`BTC-USDT`) and an active, accepted setup revision in the product database.
3. Add the required variables to `.env`.
4. Run `pnpm btc-monitor` from the repository root.

The process logs JSON records for startup, detected/rejected/failed outcomes, and feed errors. Stop it with `SIGINT` or `SIGTERM`; it drains the market-data feed before disconnecting from Postgres.

## Configuration

| Variable | Required | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string for product persistence. |
| `BTC_MONITOR_SETUP_DEFINITION_ID` | yes | Active setup definition to evaluate. |
| `BTC_MONITOR_MONITORED_SYMBOL_ID` | no | Canonical monitored symbol; defaults to `BTC-USDT`. |
| `BTC_MONITOR_BACKFILL_HOURS` | no | Historical warm-up window, from 1 to 720 hours; defaults to 24. |
| `BTC_MONITOR_DATABASE_SCHEMA` | no | Overrides the default `product_domain` schema. |
