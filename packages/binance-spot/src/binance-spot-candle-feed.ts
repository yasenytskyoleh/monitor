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
const DEFAULT_NETWORK_TIMEOUT_MS = 15_000;
const DEFAULT_LIVENESS_CHECK_INTERVAL_MS = 30_000;
const MAX_RECENT_EVENT_IDS = 4_096;
const INTERVAL_MS: Record<BinanceSpotBtcUsdtCandleInterval, number> = {
  "1m": 60_000,
  "5m": 300_000
};
const STALE_AFTER_MS: Record<BinanceSpotBtcUsdtCandleInterval, number> = {
  "1m": 180_000,
  "5m": 600_000
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

const waitForOpen = (socket: BinanceSpotWebSocket, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      settle(() => {
        socket.close();
        reject(new BinanceSpotCandleFeedError("Binance WebSocket open timed out"));
      });
    }, timeoutMs);
    socket.addEventListener("open", () => settle(resolve));
    socket.addEventListener("close", () => settle(() => reject(
      new BinanceSpotCandleFeedError("Binance WebSocket closed before opening")
    )));
    socket.addEventListener("error", () => settle(() => reject(
      new BinanceSpotCandleFeedError("Binance WebSocket failed before opening")
    )));
  });

export const createBinanceSpotCandleFeed = (
  options: BinanceSpotCandleFeedOptions
): BinanceSpotCandleFeed => {
  const now = options.now ?? (() => new Date());
  const restBaseUrl = options.restBaseUrl ?? "https://data-api.binance.vision";
  const webSocketBaseUrl = options.webSocketBaseUrl ?? "wss://stream.binance.com:9443";
  const reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? 1_000;
  const maxReconnectDelayMs = options.maxReconnectDelayMs ?? 30_000;
  const restRequestTimeoutMs = options.restRequestTimeoutMs ?? DEFAULT_NETWORK_TIMEOUT_MS;
  const webSocketOpenTimeoutMs = options.webSocketOpenTimeoutMs ?? DEFAULT_NETWORK_TIMEOUT_MS;
  const livenessCheckIntervalMs = options.livenessCheckIntervalMs ?? DEFAULT_LIVENESS_CHECK_INTERVAL_MS;
  const staleAfterMsByInterval = { ...STALE_AFTER_MS, ...options.staleAfterMsByInterval };

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

          const signal = AbortSignal.timeout(restRequestTimeoutMs);
          let response: Response;
          try {
            response = await options.fetchImpl(url, { signal });
          } catch (error: unknown) {
            if (signal.aborted) {
              throw new BinanceSpotCandleFeedError("Binance REST kline request timed out");
            }
            throw error;
          }
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
      let reconnectTask: Promise<void> | undefined;
      let cancelReconnectDelay: (() => void) | undefined;
      let startResolved = false;
      let bootstrapping = true;
      let bufferedCandles: CandleClosedEvent[] = [];
      let messageQueue: Promise<void> = Promise.resolve();
      let emissionTail: Promise<void> = Promise.resolve();
      let livenessTimer: ReturnType<typeof setInterval> | undefined;
      const recentEventIds = new Set<string>();
      const recentEventIdOrder: string[] = [];
      const latestOpenTimeByInterval = new Map<BinanceSpotBtcUsdtCandleInterval, string>();
      const latestLiveOpenTimeByInterval = new Map<BinanceSpotBtcUsdtCandleInterval, string>();
      const lastLiveAtMs = new Map<BinanceSpotBtcUsdtCandleInterval, number>();

      const reportRecovery = (
        kind: "gap_detected" | "stream_stale" | "reconnected",
        interval?: BinanceSpotBtcUsdtCandleInterval
      ): void => {
        try {
          options.onRecoveryEvent?.({ kind, interval, observedAtUtc: now().toISOString() });
        } catch {
          // Observability must not interrupt recovery.
        }
      };

      const reportError = (error: unknown): void => {
        try {
          const reported = sink.onError?.(toError(error));
          void Promise.resolve(reported).catch(() => undefined);
        } catch {
          // Error observers must not interrupt feed processing.
        }
      };

      const emitOne = async (candle: CandleClosedEvent): Promise<void> => {
        if (stopped) return;
        if (recentEventIds.has(candle.eventId)) {
          return;
        }
        const timeframe = candle.payload.timeframe as BinanceSpotBtcUsdtCandleInterval;
        const latestOpenTime = latestOpenTimeByInterval.get(timeframe);
        if (latestOpenTime && candle.payload.openTimeUtc <= latestOpenTime) {
          return;
        }

        await sink.onCandle(candle);
        recentEventIds.add(candle.eventId);
        recentEventIdOrder.push(candle.eventId);
        if (recentEventIdOrder.length > MAX_RECENT_EVENT_IDS) {
          const expiredEventId = recentEventIdOrder.shift();
          if (expiredEventId) {
            recentEventIds.delete(expiredEventId);
          }
        }
        latestOpenTimeByInterval.set(timeframe, candle.payload.openTimeUtc);
      };

      const emit = (candle: CandleClosedEvent): Promise<void> => {
        const emitted = emissionTail.then(() => emitOne(candle));
        emissionTail = emitted.catch((error: unknown) => {
          reportError(error);
        });
        return emissionTail;
      };

      const emitBackfill = async (backfillRange: BinanceSpotCandleBackfillRange): Promise<void> => {
        const candles = await backfillClosedCandles(backfillRange);
        for (const candle of candles) {
          await emit(candle);
        }
      };

      const reconnectFromLatest = async (): Promise<void> => {
        await emissionTail;
        const starts = [...latestOpenTimeByInterval.values()];
        if (starts.length === 0) {
          await emitBackfill(range);
          return;
        }

        await emitBackfill({ startTimeUtc: starts.sort()[0] as string });
      };

      const processMessage = async (data: unknown): Promise<void> => {
        if (stopped) return;
        const candle = normalizeBinanceWebSocketKline(parseMessage(data), now().toISOString());
        if (!candle) {
          return;
        }
        if (bootstrapping) {
          bufferedCandles.push(candle);
          return;
        }
        const interval = candle.payload.timeframe as BinanceSpotBtcUsdtCandleInterval;
        const latestOpenTime = latestOpenTimeByInterval.get(interval);
        if (latestOpenTime && Date.parse(candle.payload.openTimeUtc) > Date.parse(latestOpenTime) + INTERVAL_MS[interval]) {
          bufferedCandles.push(candle);
          bootstrapping = true;
          reportRecovery("gap_detected", interval);
          socket?.close();
          beginReconnect();
          return;
        }
        const latestLiveOpenTime = latestLiveOpenTimeByInterval.get(interval);
        if (!latestLiveOpenTime || candle.payload.openTimeUtc > latestLiveOpenTime) {
          latestLiveOpenTimeByInterval.set(interval, candle.payload.openTimeUtc);
          lastLiveAtMs.set(interval, now().getTime());
        }
        await emit(candle);
      };

      const beginReconnect = (): void => {
        if (!stopped && !reconnectPending) reconnectTask = reconnect();
      };

      const checkLiveness = (): void => {
        if (stopped || bootstrapping || reconnectPending) return;
        const checkedAtMs = now().getTime();
        for (const interval of BINANCE_SPOT_BTCUSDT_CANDLE_INTERVALS) {
          const lastLiveAt = lastLiveAtMs.get(interval);
          if (lastLiveAt === undefined || checkedAtMs - lastLiveAt < staleAfterMsByInterval[interval]) continue;
          bootstrapping = true;
          reportRecovery("stream_stale", interval);
          socket?.close();
          beginReconnect();
          return;
        }
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
          if (socket !== nextSocket) return;
          messageQueue = messageQueue
            .then(() => processMessage(event.data))
            .catch((error: unknown) => reportError(error));
        });
        nextSocket.addEventListener("error", () => {
          if (!stopped) {
            void reportError(new BinanceSpotCandleFeedError("Binance WebSocket error"));
          }
        });
        nextSocket.addEventListener("close", () => {
          socketClosed = true;
          if (!stopped && socket === nextSocket && (isReconnect || startResolved)) {
            beginReconnect();
          }
        });

        await waitForOpen(nextSocket, webSocketOpenTimeoutMs);
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
        for (const interval of BINANCE_SPOT_BTCUSDT_CANDLE_INTERVALS) {
          lastLiveAtMs.set(interval, now().getTime());
          const latest = latestOpenTimeByInterval.get(interval);
          if (latest) latestLiveOpenTimeByInterval.set(interval, latest);
        }
        if (isReconnect) reportRecovery("reconnected");
      };

      const reconnect = async (): Promise<void> => {
        if (stopped || reconnectPending) {
          return;
        }
        reconnectPending = true;
        bootstrapping = true;
        try {
          while (!stopped) {
            const reconnectDelayMs = Math.min(
              reconnectBaseDelayMs * 2 ** reconnectAttempts,
              maxReconnectDelayMs
            );
            reconnectAttempts += 1;
            await new Promise<void>((resolve) => {
              const timer = setTimeout(resolve, reconnectDelayMs);
              cancelReconnectDelay = () => {
                clearTimeout(timer);
                resolve();
              };
            });
            cancelReconnectDelay = undefined;
            if (stopped) return;
            try {
              await connect(true);
              return;
            } catch (error) {
              socket?.close();
              reportError(error);
            }
          }
        } finally {
          reconnectPending = false;
        }
      };

      try {
        await connect(false);
        startResolved = true;
        livenessTimer = setInterval(checkLiveness, livenessCheckIntervalMs);
      } catch (error) {
        stopped = true;
        if (livenessTimer) clearInterval(livenessTimer);
        socket?.close();
        await reportError(error);
        throw toError(error);
      }

      return {
        async stop(): Promise<void> {
          stopped = true;
          if (livenessTimer) clearInterval(livenessTimer);
          socket?.close();
          cancelReconnectDelay?.();
          await reconnectTask;
          await messageQueue;
          await emissionTail;
        }
      };
    }
  };
};
