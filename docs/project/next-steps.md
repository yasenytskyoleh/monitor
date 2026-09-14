# Next Steps

## Current recommended next step
### Add durable scheduler run ownership after the BTC pilot

Reason:
- Binance REST backfill and WebSocket ingestion are connected to the real product persistence path
- the canonical BTC setup can now be migrated and seeded reproducibly without destructive resets
- the bounded pilot proves Postgres, historical ingestion, live ingestion, idempotency, and graceful cleanup
- evaluation and Telegram delivery already exist as explicit bounded host commands
- unattended ownership is now the missing boundary; feature expansion remains deferred

## Recommended near-future sequence
1. continue a longer local soak with `pnpm btc-monitor:docker` and inspect its structured logs
2. define durable scheduler ownership and overlap prevention for bounded jobs
3. schedule evaluation, notification delivery, and reconciliation only after that ownership exists
4. keep Telegram delivery opt-in and keep trading out of scope

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- inferring manual-approval or reviewer-supplied command fields from routing metadata
- adding provider retries, an unbounded queue, automatic reconciliation, or trading integration
  before the lease and scheduler contracts are explicit
- presenting an alert as investment advice or using it to place an order automatically

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
