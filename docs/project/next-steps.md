# Next Steps

## Current recommended next step
### Extend the one-shot research workflow upstream through feedback decision and manual approval

This file is **authoritative** for the current step. `current-phase.md`, `project-overview.md`,
`chat-briefing.md`, and `decisions-log.md` restate it; if they ever disagree, this file wins and the
others get corrected.

Reason:
- `apps/research-workflow-runner` now exposes explicit `route`, `prepare`, and `execute` commands
- the commands compose the shared Prisma repository bundle and real domain handoffs while keeping
  every step manually invoked and fail-closed
- an opt-in disposable-Postgres test proves route -> prepare -> audited activation execution,
  including durable routing, envelope, audit, and activation records
- `review-packet` and `review-decision` now operate as separate manual commands; the packet is an
  explicit local JSON artifact and the recorded decision is durable
- feedback-decision and manual-approval recording are the next upstream human gates

## Recommended near-future sequence
1. ~~compose the post-decision route -> prepare -> audited execution runtime~~ — **done**
2. ~~add explicit one-shot `route`, `prepare`, and `execute` operator commands~~ — **done**
3. ~~prove the command path against disposable real Postgres~~ — **done**
4. ~~add explicit one-shot review-packet and review-decision commands~~ — **done**
5. add earlier feedback-decision and manual-approval entrypoints separately, preserving every human
   gate
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

The full cadence observation window closed successfully on 2026-09-29:

| Evidence | Observed |
|---|---|
| durable run history | 114/114 `btc_evaluate` runs completed across 27.88 hours, with no `failed` or `abandoned` runs |
| controlled exception | `d94cfb37-2544-493e-845b-bf25b74c55a3` was the only `completed_with_item_failures` run and was expected during the intermediate timestamp-fix deployment |
| launchd | 155 invocations; last exit code `0` |
| aggregate freshness | aggregate completed with 197 evaluations; `computed_at_utc` was `2026-09-29T00:24:59.999Z`, equal to the newest included evaluation and still fresh |
| aggregate metrics | 104/197 positive evaluations; average percentage move `+0.702126%` |
| live ingestion | recent WebSocket errors were transient and recovered; the stream remained active through `2026-09-29T07:59:59.999Z` |

This closes the external BTC cadence validation phase. Cadence remains externally owned; the
result does not introduce retries, an in-repo scheduler, automatic Telegram delivery, or trading.

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

## Current implementation target
- **extend the one-shot application upstream through feedback decision and manual approval.**
  Keep each human gate separately invoked with explicit reviewer identity, timestamps, and target
  references. Reuse existing domain services and the shared Prisma bundle.

### Phase 1.56 completion evidence
- `review-packet` builds a query artifact through the existing runtime and writes it to a new local
  JSON file; `review-decision` reads that explicit snapshot and records the reviewer-supplied outcome
- the decision command rejects missing packet linkage and ineligible acceptance through existing
  domain rules; all rejected outcomes return a non-zero process exit code
- disposable-Postgres integration covers packet creation, rejected linkage and lifecycle cases,
  and durable review-decision recording

### Phase 1.55 completion evidence
- root command `pnpm research-workflow <route|prepare|execute>` exposes three explicit one-shot
  steps and emits JSON outcomes with non-zero exits for rejected or failed results
- `apps/research-workflow-runner/README.md` documents required database configuration, target
  references, refinement inputs, and identifier handoff between commands
- the opt-in integration test executes the production command composition against disposable real
  Postgres and verifies durable routing, preparation envelope, execution audit, activation record,
  and activated setup state
- root `pnpm test:integration` and CI now include both domain-model and research-workflow integration
  suites

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
