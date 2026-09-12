import assert from "node:assert/strict";
import test from "node:test";

import {
  BtcMonitorConfigurationError,
  DEFAULT_BTC_NOTIFICATION_POLICY,
  loadBtcMonitorConfiguration
} from "../src/config.js";

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
    notificationPolicy: DEFAULT_BTC_NOTIFICATION_POLICY,
    databaseSchema: "monitoring"
  });
});

test("loads conservative, bounded notification policy overrides", () => {
  const configuration = loadBtcMonitorConfiguration({
    DATABASE_URL: "postgresql://monitor.example/monitor",
    BTC_MONITOR_SETUP_DEFINITION_ID: "setup-btc-breakout",
    BTC_MONITOR_NOTIFICATION_POLICY_ID: "btc-breakout-v2",
    BTC_MONITOR_NOTIFICATION_MIN_COMPLETED_EVALUATIONS: "50",
    BTC_MONITOR_NOTIFICATION_MIN_POSITIVE_OUTCOME_RATE: "0.65",
    BTC_MONITOR_NOTIFICATION_MIN_AVERAGE_PERCENTAGE_MOVE: "0.75",
    BTC_MONITOR_NOTIFICATION_MAX_SIGNAL_AGE_MINUTES: "10",
    BTC_MONITOR_NOTIFICATION_MAX_AGGREGATE_AGE_HOURS: "12"
  }, NOW);

  assert.deepEqual(configuration.notificationPolicy, {
    policyId: "btc-breakout-v2",
    minCompletedEvaluations: 50,
    minPositiveOutcomeRate: 0.65,
    minAveragePercentageMove: 0.75,
    maxSignalAgeMs: 10 * 60 * 1_000,
    maxAggregateAgeMs: 12 * 60 * 60 * 1_000
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
