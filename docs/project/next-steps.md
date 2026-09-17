# Next Steps

## Current recommended next step
### Validate and explicitly enable external BTC evaluation cadence

Reason:
- Binance REST backfill and WebSocket ingestion are connected to the real product persistence path
- the canonical BTC setup can now be migrated and seeded reproducibly without destructive resets
- the bounded pilot proves Postgres, historical ingestion, live ingestion, idempotency, and graceful cleanup
- evaluation and Telegram delivery are bounded commands with durable cross-process run ownership
- the six-hour reliability soak completed successfully
- external evaluator cadence is prepared for macOS and Linux but remains disabled by default

## Recommended near-future sequence
1. verify two sequential Docker evaluator runs and their durable run history
2. explicitly enable the appropriate five-minute external evaluator timer on the chosen host
3. observe run history, overlap skips, and expired-lease takeover before any retry policy is considered
4. decide separately whether to enable Telegram delivery; keep trading out of scope

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- inferring manual-approval or reviewer-supplied command fields from routing metadata
- adding provider retries, an unbounded queue, a scheduler daemon, or trading integration
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
