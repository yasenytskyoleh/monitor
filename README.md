# Monitor

Monitor is a read-only crypto monitoring and research system. The current runnable pilot follows
BTC/USDT Spot closed candles from Binance, evaluates a five-minute breakout rule, and persists
traceable research candidates in Postgres. It does not place orders.

## Fastest real-data check

Create `.env` from `.env.example` if needed, then run:

```bash
pnpm btc-pilot
```

This builds the production-style BTC image, starts local Postgres, deploys migrations, idempotently
seeds the canonical setup, processes a 24-hour Binance backfill, waits for the next live closed
candle, and exits with a JSON summary. It can succeed with zero detections because a breakout is not
guaranteed during the sampled market window.

Run the long-lived container after the smoke check:

```bash
pnpm btc-monitor:docker
```

Stop the pilot stack without deleting its Postgres volume:

```bash
pnpm btc-pilot:down
```

## Host development

The same workflow remains available without rebuilding the image:

```bash
pnpm infra:up
pnpm db:migrate
pnpm btc-seed
pnpm btc-smoke
pnpm btc-monitor
```

See `apps/btc-monitor/README.md` for evaluation, notification, configuration, and scheduling details.

The bounded evaluation and notification commands acquire renewable ownership in Postgres before
work begins. Concurrent invocations for the same scope exit successfully without duplicating work.
