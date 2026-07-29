# Binance Spot Candle Ingestion

## Purpose

`@monitor/binance-spot` is the first provider adapter. It reads public Binance Spot BTCUSDT
candles at 1m and 5m, then normalizes them into the existing `CandleClosedEvent` contract.

The package deliberately owns Binance URLs, payload shapes, symbol spelling, and transport details.
Only normalized events cross into `@monitor/domain-model`.

## Feed behavior

- `backfillClosedCandles(range)` pages the public Kline REST endpoint and returns chronological,
  closed candles only.
- `startClosedCandleFeed(range, sink)` opens the combined Kline stream before requesting history,
  buffers closed stream messages during backfill, then emits the deduplicated history and buffer.
- A live session emits only candles whose provider payload marks them closed. It reconnects with a
  bounded exponential delay and backfills from the earliest in-memory candle after a disconnect.

Each normalized event has a deterministic ID based on provider symbol, interval, and candle open
time. Malformed payloads and payloads for an unconfigured symbol are reported to the optional sink
error handler and are never emitted as domain events.

## Operational boundaries

- Binance requests are public, read-only market-data requests; the adapter accepts no credentials
  and cannot place orders or access account data.
- The pilot supports only Binance Spot mainnet `BTCUSDT`, mapped to canonical `BTC-USDT`, at 1m and
  5m in UTC.
- The adapter stores neither event history nor a checkpoint. After a process restart, its caller
  must provide a fresh historical range before relying on live events.
- No scheduler, worker lifecycle, persistence/replay store, alerting, or pattern-detection policy
  is part of this package.

## Verification

- `pnpm --filter @monitor/binance-spot test` runs fully mocked REST and WebSocket coverage.
- `pnpm --filter @monitor/binance-spot test:smoke` performs an opt-in, read-only public REST check.
  It is intentionally excluded from the normal test suite.
