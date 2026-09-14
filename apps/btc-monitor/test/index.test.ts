import assert from "node:assert/strict";
import test from "node:test";

import type { ClosedCandlePatternDetectionFeedEvent } from "@monitor/pattern-detection";

import { createBtcMonitorProgressReporter } from "../src/index.js";

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
    outcomeCounts: { no_match: 1 }
  });
});
