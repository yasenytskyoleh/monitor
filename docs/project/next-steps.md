# Next Steps

## Current recommended next step
### Validate and explicitly enable external BTC evaluation cadence

This file is **authoritative** for the current step. `current-phase.md`, `project-overview.md`,
`chat-briefing.md`, and `decisions-log.md` restate it; if they ever disagree, this file wins and the
others get corrected.

Reason:
- Binance REST backfill and WebSocket ingestion are connected to the real product persistence path
- the canonical BTC setup can be migrated and seeded reproducibly without destructive resets
- the bounded pilot proves Postgres, historical ingestion, live ingestion, idempotency, and cleanup
- evaluation and Telegram delivery are bounded commands with durable cross-process run ownership
- the six-hour reliability soak completed successfully
- external evaluator cadence is prepared for macOS and Linux but remains installed on neither

## Recommended near-future sequence
1. verify two sequential Docker evaluator runs and their durable run history
2. verify a concurrent invocation skips with `already_running` and still exits zero
3. verify an interrupted run is taken over as `abandoned` after its lease expires
4. only then choose a host and explicitly enable the five-minute evaluator timer
5. observe run history for at least a day before any retry policy is considered
6. decide separately whether to enable Telegram delivery; keep trading out of scope

## Known gaps to schedule after the cadence work
- `pattern_notification` is the only persisted entity outside the shared ports-and-adapters
  composition; it has a direct Prisma repository, no in-memory adapter, and no domain-model tests
- `review_decision_routing_result` is persisted with no `PRODUCT_WRITE_PATH_OWNERSHIP` entry
- `packages/evaluation-aggregation` is not wired into `apps/btc-monitor`; either wire it or remove it
- `apps/btc-monitor/src/{evaluate,notify}.ts` run on import, so they cannot be unit-tested
- there is no CI; every baseline verification is manual
- ADR-089 and ADR-090 name follow-up ADRs that were never written. The **code** for monitored-symbol
  and research-run is complete — only the ADR trail is partial. Do not re-open that work.

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- inferring manual-approval or reviewer-supplied command fields from routing metadata
- adding provider retries, an unbounded queue, a scheduler daemon, or trading integration
- presenting an alert as investment advice or using it to place an order automatically
- re-creating hand-maintained lists of every ADR or doc path inside the canonical status docs

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```

`test:integration` needs Postgres running (`pnpm infra:up`) **and** the disposable integration
database migrated. Once `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL` is set the suite connects rather
than skipping, so an unprepared database fails the run with `ECONNREFUSED` instead of skipping.
