import process from "node:process";

import { createBinanceSpotCandleFeed, type BinanceSpotWebSocket } from "@monitor/binance-spot";
import {
  createImplementedProductRelationalPrismaRepositories,
  type FirstDurableRelationalPrismaClientOptions
} from "@monitor/domain-model";
import type { ClosedCandlePatternDetectionFeedEvent } from "@monitor/pattern-detection";

import { createBtcMonitorRuntime } from "./btc-monitor-runtime.js";
import { loadBtcMonitorConfiguration } from "./config.js";

type ConsoleLogger = Pick<Console, "error" | "info">;

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
  let subscription: { stop(): Promise<void> } | undefined;
  let shutdownRequested = false;
  let shutdown: Promise<void> | undefined;
  let resolveStopped: (() => void) | undefined;
  const stopped = new Promise<void>((resolve) => {
    resolveStopped = resolve;
  });
  const disconnect = (): Promise<void> => repositories.disconnect();
  const stop = (signal: NodeJS.Signals): void => {
    shutdownRequested = true;
    if (!subscription) {
      process.removeListener("SIGINT", onSigint);
      process.removeListener("SIGTERM", onSigterm);
      process.kill(process.pid, signal);
      return;
    }
    if (shutdown) return;
    shutdown = subscription.stop()
      .catch((error: unknown) => logError(logger, error instanceof Error ? error : new Error("shutdown failed")))
      .then(disconnect)
      .catch((error: unknown) => logError(logger, error instanceof Error ? error : new Error("disconnect failed")))
      .then(() => resolveStopped?.());
  };
  const onSigint = (): void => stop("SIGINT");
  const onSigterm = (): void => stop("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  try {
    const runtime = createBtcMonitorRuntime({
      configuration,
      repositories,
      candleFeed: createBinanceSpotCandleFeed({ fetchImpl: fetch, createWebSocket }),
      onDetection(event): void { logDetection(logger, event); },
      onError(error): void { logError(logger, error); }
    });
    subscription = await runtime.start();
    if (shutdownRequested) {
      stop("SIGINT");
      await shutdown;
      return;
    }
    logger.info(JSON.stringify({
      kind: "btc_monitor_started",
      setupDefinitionId: configuration.setupDefinitionId,
      monitoredSymbolId: configuration.monitoredSymbolId,
      backfillStartTimeUtc: configuration.backfillStartTimeUtc
    }));
    await stopped;
  } catch (error: unknown) {
    await disconnect();
    throw error;
  } finally {
    process.removeListener("SIGINT", onSigint);
    process.removeListener("SIGTERM", onSigterm);
  }
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  void runBtcMonitor().catch((error: unknown) => {
    logError(console, error instanceof Error ? error : new Error("BTC monitor failed to start"));
    process.exitCode = 1;
  });
}
