import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import type { ClosedCandlePatternDetectionFeedEvent } from "@monitor/pattern-detection";

import { createBtcMonitorProgressReporter, runBtcMonitorLifecycle } from "../src/index.js";

const event = (timeframe: "1m" | "5m", index: number): ClosedCandlePatternDetectionFeedEvent => ({
  candle: {
    eventId: `binance:BTC-USDT:${timeframe}:${index}`,
    sourceId: "binance-spot",
    symbolId: "BTC-USDT",
    eventType: "candle_closed",
    eventTimestampUtc: `2026-09-14T12:${String(index).padStart(2, "0")}:59.999Z`,
    payload: {
      timeframe,
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 10,
      openTimeUtc: `2026-09-14T12:${String(index).padStart(2, "0")}:00.000Z`,
      closeTimeUtc: `2026-09-14T12:${String(index).padStart(2, "0")}:59.999Z`
    },
    metadata: {
      schemaVersion: "monitoring.v1",
      normalizationVersion: "binance.v1",
      ingestedAtUtc: "2026-09-14T12:00:00.000Z",
      providerPayloadVersion: null,
      traceId: null
    }
  },
  outcomes: [{ status: "no_match", eventId: `event-${index}`, setupDefinitionId: "setup-btc-breakout" }]
});

test("suppresses backfill progress and reports cumulative live counts on five-minute candles", () => {
  const messages: string[] = [];
  const reporter = createBtcMonitorProgressReporter({
    info(message) { messages.push(String(message)); },
    error() {}
  });

  reporter.onProcessed(event("1m", 0));
  reporter.onProcessed(event("5m", 0));
  reporter.markLive();
  reporter.onProcessed(event("1m", 1));
  reporter.onProcessed(event("1m", 2));
  reporter.onProcessed(event("5m", 5));

  assert.equal(messages.length, 1);
  assert.deepEqual(JSON.parse(messages[0] ?? "{}"), {
    kind: "btc_monitor_progress",
    observedAt: "2026-09-14T12:05:59.999Z",
    lastEventId: "binance:BTC-USDT:5m:5",
    liveCandleCounts: { "1m": 2, "5m": 1 },
    lastCandles: {
      "1m": { eventId: "binance:BTC-USDT:1m:2", openTimeUtc: "2026-09-14T12:02:00.000Z" },
      "5m": { eventId: "binance:BTC-USDT:5m:5", openTimeUtc: "2026-09-14T12:05:00.000Z" }
    },
    outcomeCounts: { no_match: 1 }
  });
});

const logger = { info() {}, error() {} };

test("fails and disconnects when processing fails during startup backfill", async () => {
  const signals = new EventEmitter();
  let stopped = 0;
  let disconnected = 0;
  let started = 0;
  await assert.rejects(
    () => runBtcMonitorLifecycle({
      logger,
      signals,
      async start(onFailure) {
        onFailure("fixture:5m:20");
        return { async stop() { stopped += 1; } };
      },
      async disconnect() { disconnected += 1; },
      onStarted() { started += 1; }
    }),
    /BTC candle processing failed/
  );
  assert.deepEqual({ stopped, disconnected, started }, { stopped: 1, disconnected: 1, started: 0 });
  assert.equal(signals.listenerCount("SIGTERM"), 0);
});

test("fails and disconnects when processing fails after startup", async () => {
  const signals = new EventEmitter();
  let notifyFailure: ((candleEventId: string) => void) | undefined;
  let stopped = 0;
  let disconnected = 0;
  const running = runBtcMonitorLifecycle({
    logger,
    signals,
    async start(onFailure) {
      notifyFailure = onFailure;
      return { async stop() { stopped += 1; } };
    },
    async disconnect() { disconnected += 1; },
    onStarted() {}
  });
  await Promise.resolve();
  notifyFailure?.("fixture:5m:21");
  await assert.rejects(() => running, /BTC candle processing failed/);
  assert.deepEqual({ stopped, disconnected }, { stopped: 1, disconnected: 1 });
});

test("SIGTERM stops and disconnects without a processing failure", async () => {
  const signals = new EventEmitter();
  let stopped = 0;
  let disconnected = 0;
  const running = runBtcMonitorLifecycle({
    logger,
    signals,
    async start() { return { async stop() { stopped += 1; } }; },
    async disconnect() { disconnected += 1; },
    onStarted() {}
  });
  await Promise.resolve();
  signals.emit("SIGTERM");
  await running;
  assert.deepEqual({ stopped, disconnected }, { stopped: 1, disconnected: 1 });
  assert.equal(signals.listenerCount("SIGTERM"), 0);
});

test("startup failure disconnects and removes signal handlers", async () => {
  const signals = new EventEmitter();
  let disconnected = 0;
  await assert.rejects(
    () => runBtcMonitorLifecycle({
      logger,
      signals,
      async start() { throw new Error("startup failed"); },
      async disconnect() { disconnected += 1; },
      onStarted() {}
    }),
    /startup failed/
  );
  assert.equal(disconnected, 1);
  assert.equal(signals.listenerCount("SIGTERM"), 0);
});
