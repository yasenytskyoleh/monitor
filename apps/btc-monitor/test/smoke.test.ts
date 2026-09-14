import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryMonitoredSymbolRepository,
  InMemoryPatternNotificationRecordRepository,
  InMemorySetupAggregateResultRepository,
  InMemorySetupDefinitionRepository,
  InMemorySetupDefinitionRevisionRepository,
  InMemorySetupRevisionActivationRecordRepository,
  InMemorySignalCandidateRepository,
  type CandleClosedEvent
} from "@monitor/domain-model";
import type { ClosedCandleFeed, ClosedCandleFeedSink } from "@monitor/pattern-detection";

import { seedBtcPilot } from "../src/btc-pilot-seed.js";
import { loadBtcSmokeConfiguration } from "../src/config.js";
import { BtcSmokeError, runBtcSmoke } from "../src/smoke.js";

const START_TIME_MS = Date.parse("2026-09-14T12:00:00.000Z");

const candle = (timeframe: "1m" | "5m", index: number): CandleClosedEvent => {
  const intervalMs = timeframe === "1m" ? 60_000 : 300_000;
  const openTimeMs = START_TIME_MS + index * intervalMs;
  return {
    eventId: `smoke:${timeframe}:${index}`,
    sourceId: "binance-spot-mainnet",
    symbolId: "BTC-USDT",
    eventType: "candle_closed",
    eventTimestampUtc: new Date(openTimeMs + intervalMs - 1).toISOString(),
    payload: {
      timeframe,
      open: 99,
      high: 100,
      low: 98,
      close: 99,
      volume: 10,
      openTimeUtc: new Date(openTimeMs).toISOString(),
      closeTimeUtc: new Date(openTimeMs + intervalMs - 1).toISOString()
    },
    metadata: {
      schemaVersion: "monitoring.v1",
      normalizationVersion: "smoke-test.v1",
      ingestedAtUtc: new Date(openTimeMs).toISOString(),
      providerPayloadVersion: null,
      traceId: null
    }
  };
};

const createRepositories = async () => {
  const repositories = {
    monitoredSymbolRepository: new InMemoryMonitoredSymbolRepository(),
    patternNotificationRecordRepository: new InMemoryPatternNotificationRecordRepository(),
    setupAggregateResultRepository: new InMemorySetupAggregateResultRepository(),
    setupDefinitionRepository: new InMemorySetupDefinitionRepository(),
    setupDefinitionRevisionRepository: new InMemorySetupDefinitionRevisionRepository(),
    setupRevisionActivationRecordRepository: new InMemorySetupRevisionActivationRecordRepository(),
    signalCandidateRepository: new InMemorySignalCandidateRepository()
  };
  await seedBtcPilot({ repositories, now: new Date(START_TIME_MS) });
  return repositories;
};

class SmokeFeed implements ClosedCandleFeed {
  stopped = false;

  constructor(
    private readonly backfill: CandleClosedEvent[],
    private readonly live?: CandleClosedEvent
  ) {}

  async startClosedCandleFeed(
    _range: { startTimeUtc: string; endTimeUtc?: string },
    sink: ClosedCandleFeedSink
  ): Promise<{ stop(): Promise<void> }> {
    for (const event of this.backfill) await sink.onCandle(event);
    if (this.live) {
      setTimeout(() => {
        void Promise.resolve(sink.onCandle(this.live as CandleClosedEvent));
      }, 0);
    }
    return {
      stop: async (): Promise<void> => {
        this.stopped = true;
      }
    };
  }
}

const configuration = (smokeTimeoutMs = 100) => ({
  ...loadBtcSmokeConfiguration(
    { DATABASE_URL: "postgresql://monitor.example/monitor" },
    new Date(START_TIME_MS)
  ),
  smokeTimeoutMs
});

const validBackfill = (): CandleClosedEvent[] => [
  candle("1m", 0),
  ...Array.from({ length: 20 }, (_, index) => candle("5m", index))
];

test("summarizes a real-data-shaped backfill and the next live candle without requiring a breakout", async () => {
  const repositories = await createRepositories();
  const feed = new SmokeFeed(validBackfill(), candle("1m", 21));

  const result = await runBtcSmoke({ repositories, candleFeed: feed, configuration: configuration() });

  assert.deepEqual(result.backfillCandles, { oneMinute: 1, fiveMinutes: 20 });
  assert.deepEqual(result.liveCandle, { eventId: "smoke:1m:21", timeframe: "1m" });
  assert.equal(result.outcomes.detected, 0);
  assert.equal(result.candidateCountBefore, 0);
  assert.equal(result.candidateCountAfter, 0);
  assert.equal(feed.stopped, true);
});

test("persists a breakout found during a successful smoke backfill", async () => {
  const repositories = await createRepositories();
  const breakout = candle("5m", 20);
  breakout.payload = { ...breakout.payload, high: 102, close: 101 };
  const feed = new SmokeFeed([...validBackfill(), breakout], candle("1m", 21));

  const result = await runBtcSmoke({ repositories, candleFeed: feed, configuration: configuration() });

  assert.equal(result.outcomes.detected, 1);
  assert.equal(result.candidateCountBefore, 0);
  assert.equal(result.candidateCountAfter, 1);
  assert.equal(feed.stopped, true);
});

test("times out while waiting for a live candle and still stops the feed", async () => {
  const repositories = await createRepositories();
  const feed = new SmokeFeed(validBackfill());

  await assert.rejects(
    () => runBtcSmoke({ repositories, candleFeed: feed, configuration: configuration(1) }),
    (error: unknown) =>
      error instanceof BtcSmokeError &&
      error.message === "Timed out waiting for a live closed Binance candle"
  );
  assert.equal(feed.stopped, true);
});

test("rejects an insufficient five-minute backfill before waiting for live data", async () => {
  const repositories = await createRepositories();
  const feed = new SmokeFeed([candle("1m", 0)], candle("1m", 1));

  await assert.rejects(
    () => runBtcSmoke({ repositories, candleFeed: feed, configuration: configuration() }),
    (error: unknown) =>
      error instanceof BtcSmokeError &&
      error.message === "Binance backfill must provide at least 20 closed 5m candles"
  );
  assert.equal(feed.stopped, true);
});

test("surfaces startup failures without reporting a successful smoke run", async () => {
  const repositories = await createRepositories();
  const failingFeed: ClosedCandleFeed = {
    async startClosedCandleFeed(): Promise<{ stop(): Promise<void> }> {
      throw new Error("feed startup failed");
    }
  };

  await assert.rejects(
    () => runBtcSmoke({ repositories, candleFeed: failingFeed, configuration: configuration() }),
    /feed startup failed/
  );
});
