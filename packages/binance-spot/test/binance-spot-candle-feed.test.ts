import assert from "node:assert/strict";
import test from "node:test";

import {
  BinanceSpotCandleFeedError,
  createBinanceSpotCandleFeed,
  type BinanceSpotWebSocket
} from "../src/index.js";

const NOW = new Date("2026-07-29T00:10:00.000Z");
const ONE_MINUTE_MS = 60_000;
const FIVE_MINUTES_MS = 300_000;

type Listener = (() => void) | ((event: { data: unknown }) => void);

class FakeWebSocket implements BinanceSpotWebSocket {
  private readonly listeners = new Map<string, Listener[]>();
  closed = false;

  addEventListener(event: "open" | "close" | "error", listener: () => void): void;
  addEventListener(event: "message", listener: (event: { data: unknown }) => void): void;
  addEventListener(event: "open" | "close" | "error" | "message", listener: Listener): void {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
  }

  close(): void {
    this.closed = true;
    this.emit("close");
  }

  emitOpen(): void {
    this.emit("open");
  }

  emitClose(): void {
    this.emit("close");
  }

  emitMessage(data: unknown): void {
    for (const listener of this.listeners.get("message") ?? []) {
      (listener as (event: { data: unknown }) => void)({ data });
    }
  }

  private emit(event: "open" | "close" | "error"): void {
    for (const listener of this.listeners.get(event) ?? []) {
      (listener as () => void)();
    }
  }
}

const restKline = (openTimeMs: number, intervalMs: number): unknown[] => [
  openTimeMs,
  "100",
  "110",
  "90",
  "105",
  "42",
  openTimeMs + intervalMs - 1,
  "4_410",
  7,
  "20",
  "2_100",
  "0"
];

const webSocketKline = (openTimeMs: number, interval: "1m" | "5m", closed = true): string =>
  JSON.stringify({
    stream: `btcusdt@kline_${interval}`,
    data: {
      e: "kline",
      E: openTimeMs + 1,
      s: "BTCUSDT",
      k: {
        t: openTimeMs,
        T: openTimeMs + (interval === "1m" ? ONE_MINUTE_MS : FIVE_MINUTES_MS) - 1,
        s: "BTCUSDT",
        i: interval,
        o: "100",
        h: "110",
        l: "90",
        c: "105",
        v: "42",
        x: closed
      }
    }
  });

const createFetch = (pages: Record<string, unknown[][]>): typeof fetch =>
  async (input) => {
    const url = new URL(input.toString());
    const interval = url.searchParams.get("interval");
    return new Response(JSON.stringify(pages[interval ?? ""] ?? []), { status: 200 });
  };

const waitForTimers = async (): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

test("backfills only closed candles in chronological order", async () => {
  const startTimeMs = Date.parse("2026-07-29T00:00:00.000Z");
  const feed = createBinanceSpotCandleFeed({
    fetchImpl: createFetch({
      "1m": [
        restKline(startTimeMs + ONE_MINUTE_MS, ONE_MINUTE_MS),
        restKline(startTimeMs, ONE_MINUTE_MS),
        restKline(NOW.getTime(), ONE_MINUTE_MS)
      ],
      "5m": [restKline(startTimeMs, FIVE_MINUTES_MS)]
    }),
    createWebSocket: () => new FakeWebSocket(),
    now: () => NOW
  });

  const candles = await feed.backfillClosedCandles({
    startTimeUtc: "2026-07-29T00:00:00.000Z",
    endTimeUtc: "2026-07-29T00:10:00.000Z"
  });

  assert.deepEqual(
    candles.map((candle) => candle.eventId),
    [
      "binance-spot:BTCUSDT:1m:1785283200000",
      "binance-spot:BTCUSDT:5m:1785283200000",
      "binance-spot:BTCUSDT:1m:1785283260000"
    ]
  );
  assert.equal(candles[0]?.payload.close, 105);
  assert.equal(candles[0]?.metadata.schemaVersion, "monitoring.v1");
});

test("paginates Binance REST kline requests after a full page", async () => {
  const startTimeMs = Date.parse("2026-07-29T00:00:00.000Z");
  const oneMinutePage = Array.from({ length: 1_000 }, (_, index) =>
    restKline(startTimeMs + index * ONE_MINUTE_MS, ONE_MINUTE_MS)
  );
  const requestedStarts: string[] = [];
  const feed = createBinanceSpotCandleFeed({
    fetchImpl: async (input) => {
      const url = new URL(input.toString());
      const interval = url.searchParams.get("interval");
      const start = url.searchParams.get("startTime") ?? "";
      requestedStarts.push(`${interval}:${start}`);
      if (interval === "1m" && start === String(startTimeMs)) {
        return new Response(JSON.stringify(oneMinutePage), { status: 200 });
      }
      if (interval === "1m") {
        return new Response(JSON.stringify([restKline(startTimeMs + 1_000 * ONE_MINUTE_MS, ONE_MINUTE_MS)]), { status: 200 });
      }
      return new Response("[]", { status: 200 });
    },
    createWebSocket: () => new FakeWebSocket(),
    now: () => new Date("2026-07-30T00:00:00.000Z")
  });

  const candles = await feed.backfillClosedCandles({ startTimeUtc: "2026-07-29T00:00:00.000Z" });

  assert.equal(candles.filter((candle) => candle.payload.timeframe === "1m").length, 1_001);
  assert.ok(requestedStarts.includes(`1m:${startTimeMs + 1_000 * ONE_MINUTE_MS}`));
});

test("rejects malformed REST candles without emitting incomplete normalized events", async () => {
  const feed = createBinanceSpotCandleFeed({
    fetchImpl: createFetch({ "1m": [[0, "bad"]], "5m": [] }),
    createWebSocket: () => new FakeWebSocket(),
    now: () => NOW
  });

  await assert.rejects(
    () => feed.backfillClosedCandles({ startTimeUtc: "2026-07-29T00:00:00.000Z" }),
    (error: unknown) =>
      error instanceof BinanceSpotCandleFeedError &&
      error.message === "Binance REST kline must be an array with at least seven fields"
  );
});

test("rejects coercible nonnumeric REST candle values", async () => {
  const malformedCandle = restKline(Date.parse("2026-07-29T00:00:00.000Z"), ONE_MINUTE_MS);
  malformedCandle[5] = null;
  const feed = createBinanceSpotCandleFeed({
    fetchImpl: createFetch({ "1m": [malformedCandle], "5m": [] }),
    createWebSocket: () => new FakeWebSocket(),
    now: () => NOW
  });

  await assert.rejects(
    () => feed.backfillClosedCandles({ startTimeUtc: "2026-07-29T00:00:00.000Z" }),
    (error: unknown) =>
      error instanceof BinanceSpotCandleFeedError && error.message === "volume must be a finite number"
  );
});

test("buffers live candles during backfill and emits each closed candle once", async () => {
  const sockets: FakeWebSocket[] = [];
  const delivered: string[] = [];
  const feed = createBinanceSpotCandleFeed({
    fetchImpl: createFetch({
      "1m": [restKline(Date.parse("2026-07-29T00:00:00.000Z"), ONE_MINUTE_MS)],
      "5m": [restKline(Date.parse("2026-07-29T00:00:00.000Z"), FIVE_MINUTES_MS)]
    }),
    createWebSocket: () => {
      const socket = new FakeWebSocket();
      sockets.push(socket);
      return socket;
    },
    now: () => NOW,
    reconnectBaseDelayMs: 0
  });

  const start = feed.startClosedCandleFeed(
    { startTimeUtc: "2026-07-29T00:00:00.000Z" },
    {
      onCandle: (candle) => {
        delivered.push(candle.eventId);
      }
    }
  );
  const socket = sockets[0];
  assert.ok(socket);
  socket.emitMessage(webSocketKline(Date.parse("2026-07-29T00:00:00.000Z"), "1m"));
  socket.emitMessage(webSocketKline(Date.parse("2026-07-29T00:01:00.000Z"), "1m"));
  socket.emitMessage(webSocketKline(Date.parse("2026-07-29T00:02:00.000Z"), "1m", false));
  socket.emitOpen();

  const subscription = await start;

  assert.deepEqual(delivered, [
    "binance-spot:BTCUSDT:1m:1785283200000",
    "binance-spot:BTCUSDT:5m:1785283200000",
    "binance-spot:BTCUSDT:1m:1785283260000"
  ]);

  await subscription.stop();
  assert.equal(socket.closed, true);
});

test("reconnects once after a disconnect, catches up, and reports malformed live payloads", async () => {
  const sockets: FakeWebSocket[] = [];
  const errors: string[] = [];
  const delivered: string[] = [];
  const feed = createBinanceSpotCandleFeed({
    fetchImpl: createFetch({
      "1m": [restKline(Date.parse("2026-07-29T00:00:00.000Z"), ONE_MINUTE_MS)],
      "5m": []
    }),
    createWebSocket: () => {
      const socket = new FakeWebSocket();
      sockets.push(socket);
      return socket;
    },
    now: () => NOW,
    reconnectBaseDelayMs: 0
  });

  const start = feed.startClosedCandleFeed(
    { startTimeUtc: "2026-07-29T00:00:00.000Z" },
    {
      onCandle: (candle) => {
        delivered.push(candle.eventId);
      },
      onError: (error) => {
        errors.push(error.message);
      }
    }
  );
  sockets[0]?.emitOpen();
  const subscription = await start;
  sockets[0]?.emitMessage("not-json");
  await Promise.resolve();
  sockets[0]?.emitClose();
  sockets[0]?.emitClose();
  await waitForTimers();

  assert.equal(sockets.length, 2);
  sockets[1]?.emitOpen();
  await waitForTimers();
  sockets[1]?.emitMessage(webSocketKline(Date.parse("2026-07-29T00:01:00.000Z"), "1m"));
  await waitForTimers();

  assert.equal(delivered.filter((eventId) => eventId.endsWith(":1785283200000")).length, 1);
  assert.ok(delivered.includes("binance-spot:BTCUSDT:1m:1785283260000"));
  assert.deepEqual(errors, ["Binance WebSocket message must contain JSON"]);

  await subscription.stop();
});

test("serializes live candle delivery while a sink is still processing", async () => {
  const sockets: FakeWebSocket[] = [];
  const delivered: string[] = [];
  let releaseFirstDelivery: (() => void) | undefined;
  const firstDelivery = new Promise<void>((resolve) => {
    releaseFirstDelivery = resolve;
  });
  const feed = createBinanceSpotCandleFeed({
    fetchImpl: createFetch({}),
    createWebSocket: () => {
      const socket = new FakeWebSocket();
      sockets.push(socket);
      return socket;
    },
    now: () => NOW
  });
  const start = feed.startClosedCandleFeed(
    { startTimeUtc: "2026-07-29T00:00:00.000Z" },
    {
      onCandle: async (candle) => {
        delivered.push(candle.eventId);
        if (delivered.length === 1) {
          await firstDelivery;
        }
      }
    }
  );
  sockets[0]?.emitOpen();
  const subscription = await start;

  sockets[0]?.emitMessage(webSocketKline(Date.parse("2026-07-29T00:01:00.000Z"), "1m"));
  await waitForTimers();
  sockets[0]?.emitMessage(webSocketKline(Date.parse("2026-07-29T00:02:00.000Z"), "1m"));
  await waitForTimers();

  assert.equal(delivered.length, 1);
  releaseFirstDelivery?.();
  await waitForTimers();
  assert.equal(delivered.length, 2);

  await subscription.stop();
});
