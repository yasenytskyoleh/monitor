# Next Steps

## Current recommended next step
### Complete observation of the enabled macOS BTC evaluation cadence

This file is **authoritative** for the current step. `current-phase.md`, `project-overview.md`,
`chat-briefing.md`, and `decisions-log.md` restate it; if they ever disagree, this file wins and the
others get corrected.

Reason:
- Binance REST backfill and WebSocket ingestion are connected to the real product persistence path
- the canonical BTC setup can be migrated and seeded reproducibly without destructive resets
- the bounded pilot proves Postgres, historical ingestion, live ingestion, idempotency, and cleanup
- evaluation and Telegram delivery are bounded commands with durable cross-process run ownership
- the six-hour reliability soak completed successfully
- the macOS launchd evaluator cadence was explicitly enabled on the local operator host on
  2026-09-28; the Linux systemd timer remains a disabled template

## Recommended near-future sequence
1. ~~verify two sequential Docker evaluator runs and their durable run history~~ — **done**
2. ~~verify a concurrent invocation skips with `already_running` and still exits zero~~ — **done**
3. ~~verify an interrupted run is taken over as `abandoned` after its lease expires~~ — **done**
4. ~~enable the macOS launchd timer~~ — **done on the local operator host on 2026-09-28**
5. **observe run history for at least a day** before closing this phase or considering any retry
   policy
6. decide separately whether to enable Telegram delivery; keep trading out of scope

### Cadence validation results
All four checks passed against the containerized evaluator:

| Check | Observed |
|---|---|
| two sequential runs | two `completed` rows with distinct run IDs; the second found every candidate already evaluated |
| concurrent invocations | one acquired and completed; the other emitted `btc_evaluation_run_skipped` / `already_running` naming the active run ID, and exited zero |
| run killed mid-flight | the row stayed `running` under a live lease, and a re-run inside that lease skipped instead of duplicating work |
| lease expiry | the next invocation took over, terminalized the orphan as `abandoned` / `lease_expired`, and completed its own run |
| aggregate freshness recovery | recovery refreshes can no longer move aggregate timestamps backwards; a live self-healing run restored `computed_at_utc` and `updated_at_utc` to the newest included evaluation (`2026-09-28T12:14:59.999Z`) |

The first observation window exposed and closed one defect: repeatedly refreshing an aggregate from
older completed evaluations could regress its freshness timestamp and make notification eligibility
report `setup_aggregate_result_stale`. Aggregate timestamps are now monotonic and derive freshness
from the newest evaluation included in the recomputation. The deployed evaluator completed a live
control run with `189/189` evaluations after repairing the stored timestamps.

`infra/btc-jobs/run-evaluate.sh` was also verified under a minimal environment
(`env -i`) because launchd does not provide a login shell's `PATH`.

### Enabling the macOS timer
The local operator host has an explicitly loaded
`~/Library/LaunchAgents/com.monitor.btc-evaluate.plist` (repo path and `~/Library/Logs/monitor`
substituted, `plutil -lint` clean). It runs every five minutes while the user session is active.
Other macOS hosts still require an explicit operator action:

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.monitor.btc-evaluate.plist
```

Disable with `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.monitor.btc-evaluate.plist`.
Docker Desktop and the prepared Postgres stack must be running; sleep or power-off does not queue
missed runs. Inspect both JSONL log files in `~/Library/Logs/monitor`.

## Known gaps to schedule after the cadence work
- **the first review/execution composition slice is implemented, but operator entrypoints and a
  real-database proof remain.** `apps/research-workflow-runner` now composes the post-decision
  routing, envelope preparation, and audited execution runtimes. Its fail-closed dispatcher allows
  only activation, lifecycle, and refinement executors and rejects the no-action target. Next add
  explicit one-shot operator commands and one opt-in Postgres integration path; keep the steps
  manual and do not add automatic chaining, retries, scheduling, Telegram delivery, or trading.

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

CI runs this same sequence on every pull request to `develop`
(`.github/workflows/verify.yml`), against a throwaway Postgres service container.

`test:integration` needs Postgres running (`pnpm infra:up`) and the disposable integration
database to exist. The suite applies its own schema migrations. Once
`PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL` is set, it connects rather than skipping, so an
unavailable database fails the run instead of skipping.
