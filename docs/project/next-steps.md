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
1. ~~verify two sequential Docker evaluator runs and their durable run history~~ — **done**
2. ~~verify a concurrent invocation skips with `already_running` and still exits zero~~ — **done**
3. ~~verify an interrupted run is taken over as `abandoned` after its lease expires~~ — **done**
4. **enable the macOS launchd timer** — the agent is prepared but deliberately not loaded (below)
5. observe run history for at least a day before any retry policy is considered
6. decide separately whether to enable Telegram delivery; keep trading out of scope

### Cadence validation results
All four checks passed against the containerized evaluator:

| Check | Observed |
|---|---|
| two sequential runs | two `completed` rows with distinct run IDs; the second found every candidate already evaluated |
| concurrent invocations | one acquired and completed; the other emitted `btc_evaluation_run_skipped` / `already_running` naming the active run ID, and exited zero |
| run killed mid-flight | the row stayed `running` under a live lease, and a re-run inside that lease skipped instead of duplicating work |
| lease expiry | the next invocation took over, terminalized the orphan as `abandoned` / `lease_expired`, and completed its own run |

`infra/btc-jobs/run-evaluate.sh` was also verified under a minimal environment
(`env -i`) because launchd does not provide a login shell's `PATH`.

### Enabling the macOS timer
The agent is written to `~/Library/LaunchAgents/com.monitor.btc-evaluate.plist` (repo path and
`~/Library/Logs/monitor` substituted, `plutil -lint` clean) but is **deliberately not loaded**.
Enabling it is an explicit operator action:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.monitor.btc-evaluate.plist
```

Disable with `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.monitor.btc-evaluate.plist`.
Docker Desktop and the prepared Postgres stack must be running; sleep or power-off does not queue
missed runs. Inspect both JSONL log files in `~/Library/Logs/monitor`.

## Known gaps to schedule after the cadence work
- `pattern_notification` is the only persisted entity outside the shared ports-and-adapters
  composition; it has a direct Prisma repository, no in-memory adapter, and no domain-model tests
- `review_decision_routing_result` is persisted with no `PRODUCT_WRITE_PATH_OWNERSHIP` entry
- **the review/execution chain has no composition root.** 15 of the 23 packages have zero workspace
  dependents — `evaluation-aggregation`, `hypothesis-evidence`, `setup-feedback`,
  `research-decision-approval`, `review-packet`, `review-decision`, `review-decision-routing`,
  `routed-action-preparation`, `execution-attempt`, the three envelope executors, `setup-revision`,
  `setup-activation`, `setup-lifecycle`, `setup-refinement`. Each depends on `domain-model` and is
  covered by its own tests, but nothing composes them into a running workflow; `apps/btc-monitor`
  wires only the market-data path. This is deliberate contract-first sequencing, **not** dead code —
  do not delete these packages. The open question is what application service should assemble them.
- `apps/btc-monitor/src/{evaluate,notify}.ts` run on import, so they cannot be unit-tested
- there is no CI; every baseline verification is manual
- **`pattern_notification` has no foreign keys**, unlike its peers (`setup_revision_activation_record`
  has four). Postgres does not enforce that a notification's candidate, setup, revision, symbol, or
  aggregate exists, so no `P2003` can be raised for that table. The Prisma adapter checks the five
  references explicitly as a stopgap, but the constraints should be added in their own slice, after
  verifying existing rows satisfy them.
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
