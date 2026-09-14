import process from "node:process";

import { createBinanceSpotCandleFeed, type BinanceSpotWebSocket } from "@monitor/binance-spot";
import {
  createImplementedProductRelationalPrismaRepositories,
  PrismaPatternNotificationRecordRepository,
  type FirstDurableRelationalPrismaClientOptions
} from "@monitor/domain-model";
import {
  CLOSED_CANDLE_BREAKOUT_LOOKBACK,
  type ClosedCandlePatternDetectionFeedEvent,
  type ClosedCandleProcessingStatus
} from "@monitor/pattern-detection";

import {
  createBtcMonitorRuntime,
  type BtcMonitorRepositories
} from "./btc-monitor-runtime.js";
import { loadBtcSmokeConfiguration, type BtcSmokeConfiguration } from "./config.js";

const NETWORK_TIMEOUT_MS = 15_000;

export type BtcSmokeResult = {
  backfillCandles: { oneMinute: number; fiveMinutes: number };
  candidateCountAfter: number;
  candidateCountBefore: number;
  liveCandle: { eventId: string; timeframe: string };
  outcomes: Record<ClosedCandleProcessingStatus, number>;
};

export type BtcSmokeOptions = {
  candleFeed: Parameters<typeof createBtcMonitorRuntime>[0]["candleFeed"];
  configuration: BtcSmokeConfiguration;
  repositories: BtcMonitorRepositories;
};

export class BtcSmokeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BtcSmokeError";
  }
}

const emptyOutcomeCounts = (): Record<ClosedCandleProcessingStatus, number> => ({
  ignored: 0,
  no_match: 0,
  detected: 0,
  rejected: 0,
  failed: 0
});

const createWebSocket = (url: string): BinanceSpotWebSocket => {
  if (!globalThis.WebSocket) {
    throw new BtcSmokeError("This Node.js runtime does not provide a global WebSocket implementation");
  }
  return new globalThis.WebSocket(url);
};

export const runBtcSmoke = async (options: BtcSmokeOptions): Promise<BtcSmokeResult> => {
  const backfillCandles = { oneMinute: 0, fiveMinutes: 0 };
  const outcomes = emptyOutcomeCounts();
  let phase: "backfill" | "live" = "backfill";
  let rejectLive: ((error: Error) => void) | undefined;
  let resolveLive: ((event: ClosedCandlePatternDetectionFeedEvent) => void) | undefined;
  const liveEvent = new Promise<ClosedCandlePatternDetectionFeedEvent>((resolve, reject) => {
    resolveLive = resolve;
    rejectLive = reject;
  });
  const candidateCountBefore = (
    await options.repositories.signalCandidateRepository.listBySetupDefinitionId(
      options.configuration.setupDefinitionId
    )
  ).length;
  const runtimeErrors: Error[] = [];
  const runtime = createBtcMonitorRuntime({
    candleFeed: options.candleFeed,
    configuration: options.configuration,
    repositories: options.repositories,
    onError(error): void {
      runtimeErrors.push(error);
      if (phase === "live") rejectLive?.(error);
    },
    onProcessed(event): void {
      for (const outcome of event.outcomes) {
        outcomes[outcome.status] += 1;
      }
      if (phase === "live") {
        resolveLive?.(event);
      } else if (event.candle.payload.timeframe === "1m") {
        backfillCandles.oneMinute += 1;
      } else if (event.candle.payload.timeframe === "5m") {
        backfillCandles.fiveMinutes += 1;
      }
    }
  });

  let subscription: Awaited<ReturnType<typeof runtime.start>> | undefined;
  let timeout: NodeJS.Timeout | undefined;
  try {
    subscription = await runtime.start();
    if (runtimeErrors[0]) throw runtimeErrors[0];
    if (backfillCandles.oneMinute === 0) {
      throw new BtcSmokeError("Binance backfill did not provide closed 1m candles");
    }
    if (backfillCandles.fiveMinutes < CLOSED_CANDLE_BREAKOUT_LOOKBACK) {
      throw new BtcSmokeError(
        `Binance backfill must provide at least ${CLOSED_CANDLE_BREAKOUT_LOOKBACK} closed 5m candles`
      );
    }

    phase = "live";
    const timeoutError = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(
        () => reject(new BtcSmokeError("Timed out waiting for a live closed Binance candle")),
        options.configuration.smokeTimeoutMs
      );
    });
    const observedLiveEvent = await Promise.race([liveEvent, timeoutError]);
    const candidateCountAfter = (
      await options.repositories.signalCandidateRepository.listBySetupDefinitionId(
        options.configuration.setupDefinitionId
      )
    ).length;

    return {
      backfillCandles,
      candidateCountAfter,
      candidateCountBefore,
      liveCandle: {
        eventId: observedLiveEvent.candle.eventId,
        timeframe: observedLiveEvent.candle.payload.timeframe
      },
      outcomes
    };
  } finally {
    if (timeout) clearTimeout(timeout);
    await subscription?.stop();
  }
};

export const runBtcSmokeCommand = async (
  environment: NodeJS.ProcessEnv = process.env,
  logger: Pick<Console, "error" | "info"> = console
): Promise<void> => {
  const configuration = loadBtcSmokeConfiguration(environment);
  const persistenceOptions: FirstDurableRelationalPrismaClientOptions = {
    connectionString: configuration.databaseUrl,
    databaseSchema: configuration.databaseSchema
  };
  const repositories = createImplementedProductRelationalPrismaRepositories(persistenceOptions);
  try {
    const result = await runBtcSmoke({
      configuration,
      repositories: {
        ...repositories,
        patternNotificationRecordRepository: new PrismaPatternNotificationRecordRepository(
          repositories.prismaClient
        )
      },
      candleFeed: createBinanceSpotCandleFeed({
        fetchImpl: fetch,
        createWebSocket,
        restRequestTimeoutMs: NETWORK_TIMEOUT_MS,
        webSocketOpenTimeoutMs: NETWORK_TIMEOUT_MS
      })
    });
    logger.info(JSON.stringify({ kind: "btc_monitor_smoke_completed", ...result }));
  } finally {
    await repositories.disconnect();
  }
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  void runBtcSmokeCommand().catch((error: unknown) => {
    console.error(JSON.stringify({
      kind: "btc_monitor_smoke_failed",
      message: error instanceof Error ? error.message : "BTC monitor smoke failed"
    }));
    process.exitCode = 1;
  });
}
