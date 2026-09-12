import assert from "node:assert/strict";
import test from "node:test";

import { BtcMonitorConfigurationError, loadBtcMonitorConfiguration } from "../src/config.js";

const NOW = new Date("2026-09-12T12:00:00.000Z");

test("loads the explicit setup selector and a bounded historical warm-up window", () => {
  const configuration = loadBtcMonitorConfiguration({
    DATABASE_URL: "postgresql://monitor.example/monitor",
    BTC_MONITOR_SETUP_DEFINITION_ID: "setup-btc-breakout",
    BTC_MONITOR_BACKFILL_HOURS: "6",
    BTC_MONITOR_DATABASE_SCHEMA: "monitoring"
  }, NOW);

  assert.deepEqual(configuration, {
    databaseUrl: "postgresql://monitor.example/monitor",
    setupDefinitionId: "setup-btc-breakout",
    monitoredSymbolId: "BTC-USDT",
    backfillStartTimeUtc: "2026-09-12T06:00:00.000Z",
    databaseSchema: "monitoring"
  });
});

test("requires durable persistence and an explicit setup definition", () => {
  assert.throws(
    () => loadBtcMonitorConfiguration({ BTC_MONITOR_SETUP_DEFINITION_ID: "setup-btc-breakout" }, NOW),
    (error: unknown) => error instanceof BtcMonitorConfigurationError && error.message === "DATABASE_URL is required"
  );
  assert.throws(
    () => loadBtcMonitorConfiguration({ DATABASE_URL: "postgresql://monitor.example/monitor" }, NOW),
    (error: unknown) => error instanceof BtcMonitorConfigurationError && error.message === "BTC_MONITOR_SETUP_DEFINITION_ID is required"
  );
});

test("rejects an unsafe or malformed historical warm-up range", () => {
  assert.throws(
    () => loadBtcMonitorConfiguration({
      DATABASE_URL: "postgresql://monitor.example/monitor",
      BTC_MONITOR_SETUP_DEFINITION_ID: "setup-btc-breakout",
      BTC_MONITOR_BACKFILL_HOURS: "0"
    }, NOW),
    (error: unknown) => error instanceof BtcMonitorConfigurationError && error.message === "BTC_MONITOR_BACKFILL_HOURS must be an integer between 1 and 720"
  );
});
