import type { CandleClosedEvent } from "@monitor/domain-model";

import {
  BINANCE_SPOT_BTCUSDT_CANDLE_INTERVALS,
  BINANCE_SPOT_BTCUSDT_CANDLE_SOURCE,
  type BinanceSpotBtcUsdtCandleInterval
} from "./types.js";

export class BinanceSpotCandleFeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BinanceSpotCandleFeedError";
  }
}

type BinanceKline = {
  openTimeMs: number;
  closeTimeMs: number;
  interval: BinanceSpotBtcUsdtCandleInterval;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asFiniteNumber = (value: unknown, fieldName: string): number => {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new BinanceSpotCandleFeedError(`${fieldName} must be a finite number`);
  }

  return numberValue;
};

const asTimestamp = (value: unknown, fieldName: string): number => {
  const timestamp = asFiniteNumber(value, fieldName);
  if (!Number.isInteger(timestamp) || timestamp <= 0) {
    throw new BinanceSpotCandleFeedError(`${fieldName} must be a positive integer timestamp`);
  }

  return timestamp;
};

const asInterval = (value: unknown): BinanceSpotBtcUsdtCandleInterval => {
  if (!BINANCE_SPOT_BTCUSDT_CANDLE_INTERVALS.includes(value as BinanceSpotBtcUsdtCandleInterval)) {
    throw new BinanceSpotCandleFeedError(`unsupported Binance candle interval: ${String(value)}`);
  }

  return value as BinanceSpotBtcUsdtCandleInterval;
};

const asUtc = (timestampMs: number): string => new Date(timestampMs).toISOString();

const toCandleEvent = (kline: BinanceKline, ingestedAtUtc: string): CandleClosedEvent => ({
  eventId: `binance-spot:${BINANCE_SPOT_BTCUSDT_CANDLE_SOURCE.providerSymbol}:${kline.interval}:${kline.openTimeMs}`,
  sourceId: BINANCE_SPOT_BTCUSDT_CANDLE_SOURCE.sourceId,
  symbolId: BINANCE_SPOT_BTCUSDT_CANDLE_SOURCE.symbolId,
  eventType: "candle_closed",
  eventTimestampUtc: asUtc(kline.closeTimeMs),
  payload: {
    timeframe: kline.interval,
    open: kline.open,
    high: kline.high,
    low: kline.low,
    close: kline.close,
    volume: kline.volume,
    openTimeUtc: asUtc(kline.openTimeMs),
    closeTimeUtc: asUtc(kline.closeTimeMs)
  },
  metadata: {
    schemaVersion: "monitoring.v1",
    normalizationVersion: "binance-spot-candle.v1",
    ingestedAtUtc,
    providerPayloadVersion: "binance-spot-kline.v1",
    traceId: null
  }
});

const parseKline = (input: {
  openTime: unknown;
  closeTime: unknown;
  interval: unknown;
  open: unknown;
  high: unknown;
  low: unknown;
  close: unknown;
  volume: unknown;
}): BinanceKline => ({
  openTimeMs: asTimestamp(input.openTime, "openTime"),
  closeTimeMs: asTimestamp(input.closeTime, "closeTime"),
  interval: asInterval(input.interval),
  open: asFiniteNumber(input.open, "open"),
  high: asFiniteNumber(input.high, "high"),
  low: asFiniteNumber(input.low, "low"),
  close: asFiniteNumber(input.close, "close"),
  volume: asFiniteNumber(input.volume, "volume")
});

export const normalizeBinanceRestKline = (
  row: unknown,
  interval: BinanceSpotBtcUsdtCandleInterval,
  ingestedAtUtc: string
): CandleClosedEvent => {
  if (!Array.isArray(row) || row.length < 7) {
    throw new BinanceSpotCandleFeedError("Binance REST kline must be an array with at least seven fields");
  }

  return toCandleEvent(
    parseKline({
      openTime: row[0],
      open: row[1],
      high: row[2],
      low: row[3],
      close: row[4],
      volume: row[5],
      closeTime: row[6],
      interval
    }),
    ingestedAtUtc
  );
};

export const normalizeBinanceWebSocketKline = (
  message: unknown,
  ingestedAtUtc: string
): CandleClosedEvent | null => {
  const envelope = isRecord(message) && isRecord(message.data) ? message.data : message;
  if (!isRecord(envelope) || envelope.e !== "kline" || !isRecord(envelope.k)) {
    throw new BinanceSpotCandleFeedError("Binance WebSocket message is not a kline event");
  }

  const kline = envelope.k;
  if (envelope.s !== BINANCE_SPOT_BTCUSDT_CANDLE_SOURCE.providerSymbol || kline.s !== envelope.s) {
    throw new BinanceSpotCandleFeedError("Binance WebSocket kline has an unconfigured symbol");
  }
  if (kline.x !== true) {
    return null;
  }

  return toCandleEvent(
    parseKline({
      openTime: kline.t,
      closeTime: kline.T,
      interval: kline.i,
      open: kline.o,
      high: kline.h,
      low: kline.l,
      close: kline.c,
      volume: kline.v
    }),
    ingestedAtUtc
  );
};
