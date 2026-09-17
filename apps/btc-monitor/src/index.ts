import process from "node:process";

import { createBinanceSpotCandleFeed, type BinanceSpotWebSocket } from "@monitor/binance-spot";
import {
  createImplementedProductRelationalPrismaRepositories,
  PrismaPatternNotificationRecordRepository,
  type FirstDurableRelationalPrismaClientOptions
} from "@monitor/domain-model";
import type { ClosedCandlePatternDetectionFeedEvent } from "@monitor/pattern-detection";

import { createBtcMonitorRuntime } from "./btc-monitor-runtime.js";
import { loadBtcMonitorConfiguration } from "./config.js";

type ConsoleLogger = Pick<Console, "error" | "info">;

export type BtcMonitorProgressReporter = {
  markLive(): void;
  onProcessed(event: ClosedCandlePatternDetectionFeedEvent): void;
};

export const createBtcMonitorProgressReporter = (
  logger: ConsoleLogger
): BtcMonitorProgressReporter => {
  let live = false;
  const candleCounts = { "1m": 0, "5m": 0 };
  const lastCandles: Record<"1m" | "5m", { eventId: string; openTimeUtc: string } | null> = {
    "1m": null,
    "5m": null
  };
  return {
    markLive(): void {
      live = true;
    },
    onProcessed(event): void {
      if (!live) return;
      const timeframe = event.candle.payload.timeframe;
      if (timeframe !== "1m" && timeframe !== "5m") return;
      candleCounts[timeframe] += 1;
      lastCandles[timeframe] = {
        eventId: event.candle.eventId,
        openTimeUtc: event.candle.payload.openTimeUtc
      };
      if (timeframe !== "5m") return;
      const outcomeCounts: Record<string, number> = {};
      for (const outcome of event.outcomes) {
        outcomeCounts[outcome.status] = (outcomeCounts[outcome.status] ?? 0) + 1;
      }
      logger.info(JSON.stringify({
        kind: "btc_monitor_progress",
        observedAt: event.candle.eventTimestampUtc,
        lastEventId: event.candle.eventId,
        liveCandleCounts: candleCounts,
        lastCandles,
        outcomeCounts
      }));
    }
  };
};

const createWebSocket = (url: string): BinanceSpotWebSocket => {
  if (!globalThis.WebSocket) throw new Error("This Node.js runtime does not provide a global WebSocket implementation");
  return new globalThis.WebSocket(url);
};

const logDetection = (logger: ConsoleLogger, event: ClosedCandlePatternDetectionFeedEvent): void => {
  logger.info(JSON.stringify({
    kind: "btc_monitor_detection",
    candleEventId: event.candle.eventId,
    observedAt: event.candle.eventTimestampUtc,
    outcomes: event.outcomes
  }));
};

const logError = (logger: ConsoleLogger, error: Error): void => {
  logger.error(JSON.stringify({ kind: "btc_monitor_error", message: error.message }));
};

type SignalSource = {
  once(signal: "SIGINT" | "SIGTERM", listener: () => void): void;
  removeListener(signal: "SIGINT" | "SIGTERM", listener: () => void): void;
};

export type BtcMonitorLifecycleOptions = {
  start(onFailure: (candleEventId: string) => void): Promise<{ stop(): Promise<void> }>;
  disconnect(): Promise<void>;
  onStarted(): void;
  logger: ConsoleLogger;
  signals?: SignalSource;
};

export const runBtcMonitorLifecycle = async (options: BtcMonitorLifecycleOptions): Promise<void> => {
  const signals = options.signals ?? process;
  let subscription: { stop(): Promise<void> } | undefined;
  let shutdownRequested = false;
  let shutdown: Promise<void> | undefined;
  let fatalError: Error | undefined;
  let resolveStopped: (() => void) | undefined;
  let rejectStopped: ((error: Error) => void) | undefined;
  const stopped = new Promise<void>((resolve, reject) => {
    resolveStopped = resolve;
    rejectStopped = reject;
  });
  const stop = (error?: Error): void => {
    if (error && !fatalError) fatalError = error;
    shutdownRequested = true;
    if (!subscription || shutdown) return;
    shutdown = subscription.stop().then(
      () => fatalError ? rejectStopped?.(fatalError) : resolveStopped?.(),
      (cause: unknown) => rejectStopped?.(cause instanceof Error ? cause : new Error("shutdown failed"))
    );
  };
  const onSigint = (): void => stop();
  const onSigterm = (): void => stop();
  signals.once("SIGINT", onSigint);
  signals.once("SIGTERM", onSigterm);
  try {
    subscription = await options.start((candleEventId) => {
      if (shutdownRequested) return;
      options.logger.error(JSON.stringify({ kind: "btc_monitor_processing_failed", candleEventId }));
      queueMicrotask(() => stop(new Error("BTC candle processing failed")));
    });
    if (shutdownRequested) {
      stop();
    } else {
      options.onStarted();
    }
    await stopped;
  } finally {
    try {
      await shutdown;
      await options.disconnect();
    } finally {
      signals.removeListener("SIGINT", onSigint);
      signals.removeListener("SIGTERM", onSigterm);
    }
  }
};

export const runBtcMonitor = async (
  environment: NodeJS.ProcessEnv = process.env,
  logger: ConsoleLogger = console
): Promise<void> => {
  const configuration = loadBtcMonitorConfiguration(environment);
  const persistenceOptions: FirstDurableRelationalPrismaClientOptions = {
    connectionString: configuration.databaseUrl,
    databaseSchema: configuration.databaseSchema
  };
  const repositories = createImplementedProductRelationalPrismaRepositories(persistenceOptions);
  const progressReporter = createBtcMonitorProgressReporter(logger);
  return runBtcMonitorLifecycle({
    logger,
    disconnect: () => repositories.disconnect(),
    onStarted(): void {
      progressReporter.markLive();
      logger.info(JSON.stringify({
        kind: "btc_monitor_started",
        setupDefinitionId: configuration.setupDefinitionId,
        monitoredSymbolId: configuration.monitoredSymbolId,
        backfillStartTimeUtc: configuration.backfillStartTimeUtc
      }));
    },
    start(onFailure) {
      const runtime = createBtcMonitorRuntime({
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
          onRecoveryEvent(event): void {
            logger.info(JSON.stringify({
              kind: "btc_monitor_feed_recovery",
              recoveryKind: event.kind,
              interval: event.interval,
              observedAtUtc: event.observedAtUtc
            }));
          }
        }),
        onDetection(event): void { logDetection(logger, event); },
        onNotification(outcome): void {
          logger.info(JSON.stringify({ kind: "btc_monitor_notification", ...outcome }));
        },
        onProcessed: progressReporter.onProcessed,
        onProcessingFailure(event): void { onFailure(event.candle.eventId); },
        onError(error): void { logError(logger, error); }
      });
      return runtime.start();
    }
  });
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  void runBtcMonitor().catch((error: unknown) => {
    logError(console, error instanceof Error ? error : new Error("BTC monitor failed to start"));
    process.exitCode = 1;
  });
}
