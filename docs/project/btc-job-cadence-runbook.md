# BTC bounded-job cadence

The six-hour BTC feed soak passed. The monitor remains a long-running worker; only the bounded
evaluator is scheduled here. Neither the macOS nor Linux timer is installed by this repository.
Telegram delivery remains manual and opt-in.

## Prepare the shared Docker stack

Use a protected `.env` with a non-default `POSTGRES_PASSWORD` on a Linux host. Keep the password
URL-safe because Compose embeds it in the container connection URL. Do not commit `.env`; restrict
its permissions to the operator. Postgres publishes only on `127.0.0.1:5432`, not on a public
interface. The Docker daemon and anyone who can inspect container environments are privileged.

On a Mac with pnpm, run `pnpm btc-pilot:prepare`. On Linux without pnpm, use:

```sh
docker compose up -d --wait postgres
docker compose --profile pilot build btc-migrate btc-monitor
docker compose --profile pilot run --rm --no-deps btc-migrate
docker compose --profile pilot run --rm --no-deps btc-seed
docker compose --profile pilot up -d --no-deps btc-monitor
```

Once prepared, `pnpm btc-evaluate:docker` or `infra/btc-jobs/run-evaluate.sh` runs one evaluator
without rebuilding or starting dependencies. A missing database is an error, not a silent skip.
Run the evaluator twice manually before enabling a timer. The command retains its JSON result
output and exits non-zero on startup or ownership failure; item-level failures remain a completed
run with `completed_with_item_failures` in Postgres.

## macOS launchd (not installed by default)

`infra/btc-jobs/launchd/com.monitor.btc-evaluate.plist.template` runs every 300 seconds while
the user session is active and immediately once when loaded. Copy it to
`~/Library/LaunchAgents/com.monitor.btc-evaluate.plist`, replace `__MONITOR_REPO__` with the
absolute checkout path and `__MONITOR_LOG_DIR__` with an existing user-writable log directory.
Validate with `plutil -lint`, then explicitly load with
`launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.monitor.btc-evaluate.plist`.
Use `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.monitor.btc-evaluate.plist` to
disable it. The stdout/stderr files retain JSON records from the job and any Docker diagnostics;
inspect both. Keep Docker Desktop and the prepared Postgres stack running. Sleep or power-off
does not queue missed runs.

## Linux systemd (templates only)

Copy `infra/btc-jobs/systemd/monitor-btc-evaluate.service.template` to
`/etc/systemd/system/monitor-btc-evaluate.service`; replace `__MONITOR_REPO__` with the absolute
checkout path (for example `/opt/monitor`) and `__MONITOR_USER__` with a dedicated account able
to access Docker. Docker access is highly privileged. Copy the adjacent `.timer` file to
`/etc/systemd/system/`, then run `systemctl daemon-reload`,
`systemd-analyze verify /etc/systemd/system/monitor-btc-evaluate.service /etc/systemd/system/monitor-btc-evaluate.timer`,
and explicitly `systemctl enable --now monitor-btc-evaluate.timer`.
The timer runs at five-minute wall-clock boundaries; `Persistent=true` starts one catch-up run
after downtime, not a queue of missed runs. Inspect `systemctl status monitor-btc-evaluate.service`
and `journalctl -u monitor-btc-evaluate.service -o cat`; JSON stdout is preserved in journald.
Disable with `systemctl disable --now monitor-btc-evaluate.timer`.

## Run evidence and alerts

Ownership is per setup and symbol, with a 120-second lease renewed every 30 seconds. A concurrent
invocation emits `btc_evaluation_run_skipped` with the active run ID and exits successfully.
Inspect recent durable outcomes in Postgres:

```sql
SELECT run_id, job_name, scope_key, status, outcome_code, summary,
       started_at_utc, completed_at_utc, lease_expires_at_utc
FROM runtime_control.scheduled_job_run
WHERE job_name = 'btc_evaluate'
ORDER BY started_at_utc DESC
LIMIT 20;
```

Investigate missing runs after the timer is enabled, `failed`/`abandoned` rows, repeated
`completed_with_item_failures`, or a stopped monitor. An `already_running` skip is normal when
two starts overlap. Do not automatically retry Telegram delivery or infer success solely from
the evaluator process exit code.

## Manual Telegram opt-in

No notifier timer is provided or enabled. To run it manually, create two protected files outside
the repository: one with the bot token, one with the chat ID. Export absolute paths as
`BTC_MONITOR_TELEGRAM_BOT_TOKEN_SECRET_PATH` and
`BTC_MONITOR_TELEGRAM_CHAT_ID_SECRET_PATH`, then inspect the opt-in configuration with
`docker compose -f compose.yaml -f compose.telegram.yaml --profile delivery config --quiet`.
Only after an explicit delivery decision, run `pnpm btc-notify:docker`. The override mounts the
files as read-only Compose secrets and passes only in-container file paths to the worker. Its
configuration rejects simultaneous direct-value and `_FILE` sources. Never run this command as
part of evaluation acceptance; test delivery using a mocked provider.
