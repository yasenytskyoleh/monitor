import assert from "node:assert/strict";
import test from "node:test";

import { createBinanceSpotCandleFeed } from "../src/index.js";

test(
  "reads public Binance Spot candles without credentials",
  { skip: process.env.RUN_BINANCE_SPOT_SMOKE !== "true" },
  async () => {
    const feed = createBinanceSpotCandleFeed({
      fetchImpl: fetch,
      createWebSocket: () => {
        throw new Error("WebSocket is not used by the REST smoke check");
      }
    });
    const end = new Date();
    const start = new Date(end.getTime() - 10 * 60_000);

    const candles = await feed.backfillClosedCandles({
      startTimeUtc: start.toISOString(),
      endTimeUtc: end.toISOString()
    });

    assert.ok(candles.length > 0);
    assert.ok(candles.every((candle) => candle.sourceId === "binance-spot-mainnet"));
  }
);
