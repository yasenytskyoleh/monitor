import type { CandleClosedEvent } from "@monitor/domain-model";

import {
  BinanceSpotCandleFeedError,
  normalizeBinanceRestKline,
  normalizeBinanceWebSocketKline
} from "./normalization.js";
import {
  BINANCE_SPOT_BTCUSDT_CANDLE_INTERVALS,
  BINANCE_SPOT_BTCUSDT_CANDLE_SOURCE,
  type BinanceSpotBtcUsdtCandleInterval,
  type BinanceSpotCandleBackfillRange,
  type BinanceSpotCandleEventSink,
  type BinanceSpotCandleFeed,
  type BinanceSpotCandleFeedOptions,
  type BinanceSpotWebSocket
} from "./types.js";

const BINANCE_KLINES_PAGE_SIZE = 1_000;
const MAX_RECENT_EVENT_IDS = 4_096;
const INTERVAL_MS: Record<BinanceSpotBtcUsdtCandleInterval, number> = {
  "1m": 60_000,
  "5m": 300_000
};

const asTimestamp = (value: string, fieldName: string): number => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new BinanceSpotCandleFeedError(`${fieldName} must be an ISO timestamp`);
  }

  return timestamp;
};

const sortCandles = (candles: CandleClosedEvent[]): CandleClosedEvent[] =>
  [...candles].sort((left, right) =>
    left.payload.openTimeUtc === right.payload.openTimeUtc
      ? left.eventId.localeCompare(right.eventId)
      : left.payload.openTimeUtc.localeCompare(right.payload.openTimeUtc)
  );

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new BinanceSpotCandleFeedError("unexpected Binance candle feed failure");

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const parseMessage = (data: unknown): unknown => {
  if (typeof data !== "string") {
    throw new BinanceSpotCandleFeedError("Binance WebSocket message must be text");
  }

  try {
    return JSON.parse(data) as unknown;
  } catch {
    throw new BinanceSpotCandleFeedError("Binance WebSocket message must contain JSON");
  }
};

const waitForOpen = (socket: BinanceSpotWebSocket): Promise<void> =>
  new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve);
    socket.addEventListener("close", () => reject(new BinanceSpotCandleFeedError("Binance WebSocket closed before opening")));
    socket.addEventListener("error", () => reject(new BinanceSpotCandleFeedError("Binance WebSocket failed before opening")));
  });

export const createBinanceSpotCandleFeed = (
  options: BinanceSpotCandleFeedOptions
): BinanceSpotCandleFeed => {
  const now = options.now ?? (() => new Date());
  const restBaseUrl = options.restBaseUrl ?? "https://data-api.binance.vision";
  const webSocketBaseUrl = options.webSocketBaseUrl ?? "wss://stream.binance.com:9443";
  const reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? 1_000;
  const maxReconnectDelayMs = options.maxReconnectDelayMs ?? 30_000;

  const backfillClosedCandles = async (
    range: BinanceSpotCandleBackfillRange
  ): Promise<CandleClosedEvent[]> => {
    const startTimeMs = asTimestamp(range.startTimeUtc, "startTimeUtc");
    const endTimeMs = range.endTimeUtc ? asTimestamp(range.endTimeUtc, "endTimeUtc") : now().getTime();
    if (startTimeMs > endTimeMs) {
      throw new BinanceSpotCandleFeedError("startTimeUtc must be before endTimeUtc");
    }

    const candles = await Promise.all(
      BINANCE_SPOT_BTCUSDT_CANDLE_INTERVALS.map(async (interval) => {
        const intervalCandles: CandleClosedEvent[] = [];
        let pageStartMs = startTimeMs;

        while (pageStartMs <= endTimeMs) {
          const url = new URL("/api/v3/klines", restBaseUrl);
          url.searchParams.set("symbol", BINANCE_SPOT_BTCUSDT_CANDLE_SOURCE.providerSymbol);
          url.searchParams.set("interval", interval);
          url.searchParams.set("startTime", String(pageStartMs));
          url.searchParams.set("endTime", String(endTimeMs));
          url.searchParams.set("limit", String(BINANCE_KLINES_PAGE_SIZE));

          const response = await options.fetchImpl(url);
          if (!response.ok) {
            throw new BinanceSpotCandleFeedError(`Binance REST kline request failed: ${response.status}`);
          }

          const payload = await response.json();
          if (!Array.isArray(payload)) {
            throw new BinanceSpotCandleFeedError("Binance REST kline response must be an array");
          }
          if (payload.length === 0) {
            break;
          }

          const ingestedAtUtc = now().toISOString();
          const closedAtMs = now().getTime();
          const pageCandles = payload.map((row) => normalizeBinanceRestKline(row, interval, ingestedAtUtc));
          intervalCandles.push(
            ...pageCandles.filter((candle) => Date.parse(candle.payload.closeTimeUtc) < closedAtMs)
          );

          const lastCandle = pageCandles.at(-1);
          if (!lastCandle) {
            break;
          }
          const nextPageStartMs = Date.parse(lastCandle.payload.openTimeUtc) + INTERVAL_MS[interval];
          if (nextPageStartMs <= pageStartMs || payload.length < BINANCE_KLINES_PAGE_SIZE) {
            break;
          }
          pageStartMs = nextPageStartMs;
        }

        return intervalCandles;
      })
    );

    return sortCandles(candles.flat());
  };

  return {
    backfillClosedCandles,

    async startClosedCandleFeed(range, sink): Promise<{ stop(): Promise<void> }> {
      let stopped = false;
      let socket: BinanceSpotWebSocket | undefined;
      let reconnectAttempts = 0;
      let reconnectPending = false;
      let startResolved = false;
      let bootstrapping = true;
      let bufferedCandles: CandleClosedEvent[] = [];
      let messageQueue: Promise<void> = Promise.resolve();
      const recentEventIds = new Set<string>();
      const recentEventIdOrder: string[] = [];
      const latestOpenTimeByInterval = new Map<BinanceSpotBtcUsdtCandleInterval, string>();

      const reportError = async (error: unknown): Promise<void> => {
        if (sink.onError) {
          await sink.onError(toError(error));
        }
      };

      const emit = async (candle: CandleClosedEvent): Promise<void> => {
        if (recentEventIds.has(candle.eventId)) {
          return;
        }

        recentEventIds.add(candle.eventId);
        recentEventIdOrder.push(candle.eventId);
        if (recentEventIdOrder.length > MAX_RECENT_EVENT_IDS) {
          const expiredEventId = recentEventIdOrder.shift();
          if (expiredEventId) {
            recentEventIds.delete(expiredEventId);
          }
        }
        latestOpenTimeByInterval.set(candle.payload.timeframe as BinanceSpotBtcUsdtCandleInterval, candle.payload.openTimeUtc);
        await sink.onCandle(candle);
      };

      const emitBackfill = async (backfillRange: BinanceSpotCandleBackfillRange): Promise<void> => {
        const candles = await backfillClosedCandles(backfillRange);
        for (const candle of candles) {
          await emit(candle);
        }
      };

      const reconnectFromLatest = async (): Promise<void> => {
        const starts = [...latestOpenTimeByInterval.values()];
        if (starts.length === 0) {
          await emitBackfill(range);
          return;
        }

        await emitBackfill({ startTimeUtc: starts.sort()[0] as string });
      };

      const processMessage = async (data: unknown): Promise<void> => {
        const candle = normalizeBinanceWebSocketKline(parseMessage(data), now().toISOString());
        if (!candle) {
          return;
        }
        if (bootstrapping) {
          bufferedCandles.push(candle);
          return;
        }
        await emit(candle);
      };

      const connect = async (isReconnect: boolean): Promise<void> => {
        const streams = BINANCE_SPOT_BTCUSDT_CANDLE_INTERVALS.map(
          (interval) => `${BINANCE_SPOT_BTCUSDT_CANDLE_SOURCE.providerSymbol.toLowerCase()}@kline_${interval}`
        );
        const url = new URL("/stream", webSocketBaseUrl);
        url.searchParams.set("streams", streams.join("/"));
        const nextSocket = options.createWebSocket(url.toString());
        socket = nextSocket;
        let socketClosed = false;

        nextSocket.addEventListener("message", (event) => {
          messageQueue = messageQueue
            .then(() => processMessage(event.data))
            .catch((error: unknown) => reportError(error).catch(() => undefined));
        });
        nextSocket.addEventListener("error", () => {
          void reportError(new BinanceSpotCandleFeedError("Binance WebSocket error"));
        });
        nextSocket.addEventListener("close", () => {
          socketClosed = true;
          if (!stopped && socket === nextSocket && (isReconnect || startResolved)) {
            void reconnect();
          }
        });

        await waitForOpen(nextSocket);
        if (stopped || socket !== nextSocket) {
          return;
        }

        if (isReconnect) {
          await reconnectFromLatest();
        } else {
          await emitBackfill(range);
        }
        if (socketClosed) {
          throw new BinanceSpotCandleFeedError("Binance WebSocket closed during bootstrap");
        }
        while (bufferedCandles.length > 0) {
          const pendingCandles = sortCandles(bufferedCandles);
          bufferedCandles = [];
          for (const candle of pendingCandles) {
            await emit(candle);
          }
        }
        bootstrapping = false;
        reconnectAttempts = 0;
      };

      const reconnect = async (): Promise<void> => {
        if (stopped || reconnectPending) {
          return;
        }
        reconnectPending = true;
        bootstrapping = true;
        const reconnectDelayMs = Math.min(
          reconnectBaseDelayMs * 2 ** reconnectAttempts,
          maxReconnectDelayMs
        );
        reconnectAttempts += 1;
        await delay(reconnectDelayMs);
        if (stopped) {
          return;
        }
        try {
          await connect(true);
          reconnectPending = false;
        } catch (error) {
          await reportError(error);
          reconnectPending = false;
          void reconnect();
        }
      };

      try {
        await connect(false);
        startResolved = true;
      } catch (error) {
        stopped = true;
        socket?.close();
        await reportError(error);
        throw toError(error);
      }

      return {
        async stop(): Promise<void> {
          stopped = true;
          socket?.close();
        }
      };
    }
  };
};
