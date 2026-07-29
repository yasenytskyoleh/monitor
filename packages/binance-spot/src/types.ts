import type { CandleClosedEvent } from "@monitor/domain-model";

export const BINANCE_SPOT_BTCUSDT_CANDLE_INTERVALS = ["1m", "5m"] as const;
export type BinanceSpotBtcUsdtCandleInterval =
  (typeof BINANCE_SPOT_BTCUSDT_CANDLE_INTERVALS)[number];

export const BINANCE_SPOT_BTCUSDT_CANDLE_SOURCE = {
  sourceId: "binance-spot-mainnet",
  symbolId: "BTC-USDT",
  providerSymbol: "BTCUSDT",
  providerInstance: "binance-spot-mainnet",
  intervals: BINANCE_SPOT_BTCUSDT_CANDLE_INTERVALS
} as const;

export type BinanceSpotCandleBackfillRange = {
  startTimeUtc: string;
  endTimeUtc?: string;
};

export type BinanceSpotCandleEventSink = {
  onCandle(event: CandleClosedEvent): Promise<void> | void;
  onError?(error: Error): Promise<void> | void;
};

export type BinanceSpotWebSocket = {
  close(): void;
  addEventListener(
    event: "open" | "close" | "error",
    listener: () => void
  ): void;
  addEventListener(event: "message", listener: (event: { data: unknown }) => void): void;
};

export type BinanceSpotCandleFeedOptions = {
  fetchImpl: typeof fetch;
  createWebSocket: (url: string) => BinanceSpotWebSocket;
  now?: () => Date;
  reconnectBaseDelayMs?: number;
  maxReconnectDelayMs?: number;
  restBaseUrl?: string;
  webSocketBaseUrl?: string;
};

export type BinanceSpotCandleFeed = {
  backfillClosedCandles(
    range: BinanceSpotCandleBackfillRange
  ): Promise<CandleClosedEvent[]>;
  startClosedCandleFeed(
    range: BinanceSpotCandleBackfillRange,
    sink: BinanceSpotCandleEventSink
  ): Promise<{ stop(): Promise<void> }>;
};
