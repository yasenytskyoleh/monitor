import type { CandleClosedEvent } from "@monitor/domain-model";

import type {
  ClosedCandlePatternDetectionRuntime,
  ClosedCandleProcessingOutcome
} from "./types.js";

export type ClosedCandleFeedRange = {
  startTimeUtc: string;
  endTimeUtc?: string;
};

export type ClosedCandleFeedSink = {
  onCandle(candle: CandleClosedEvent): Promise<void> | void;
  onError?(error: Error): Promise<void> | void;
};

export type ClosedCandleFeed = {
  /**
   * Calls `sink.onCandle` in strictly increasing open-time order for each source, symbol, and
   * timeframe stream. Implementations must preserve that invocation order even if callbacks are
   * not awaited by their provider transport.
   */
  startClosedCandleFeed(
    range: ClosedCandleFeedRange,
    sink: ClosedCandleFeedSink
  ): Promise<{ stop(): Promise<void> }>;
};

export type ClosedCandlePatternDetectionFeedEvent = {
  candle: CandleClosedEvent;
  outcomes: ClosedCandleProcessingOutcome[];
};

export type ClosedCandlePatternDetectionFeedOptions = {
  candleFeed: ClosedCandleFeed;
  detectionRuntime: ClosedCandlePatternDetectionRuntime;
  onProcessed?(event: ClosedCandlePatternDetectionFeedEvent): Promise<void> | void;
  onError?(error: Error): Promise<void> | void;
};

export type ClosedCandlePatternDetectionFeed = {
  start(range: ClosedCandleFeedRange): Promise<{ stop(): Promise<void> }>;
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error("unexpected closed-candle pattern detection failure");

export const createClosedCandlePatternDetectionFeed = (
  options: ClosedCandlePatternDetectionFeedOptions
): ClosedCandlePatternDetectionFeed => {
  const reportError = (error: unknown): void => {
    try {
      const reported = options.onError?.(toError(error));
      void Promise.resolve(reported).catch(() => undefined);
    } catch {
      // Observability callbacks must not interrupt market-data processing.
    }
  };

  return {
    async start(range) {
      let stopped = false;
      let callbackTail: Promise<void> = Promise.resolve();
      const enqueue = (callback: () => Promise<void>): Promise<void> => {
        const queued = callbackTail.then(async () => {
          if (stopped) return;
          try {
            await callback();
          } catch (error) {
            if (!stopped) reportError(error);
          }
        });
        callbackTail = queued;
        return queued;
      };
      const subscription = await options.candleFeed.startClosedCandleFeed(range, {
        async onCandle(candle) {
          await enqueue(async () => {
            const outcomes = await options.detectionRuntime.process(candle);
            if (!stopped) await options.onProcessed?.({ candle, outcomes });
          });
        },
        async onError(error) {
          await enqueue(async () => {
            reportError(error);
          });
        }
      });
      return {
        async stop() {
          stopped = true;
          let stopError: unknown;
          try {
            await subscription.stop();
          } catch (error) {
            stopError = error;
          }
          await callbackTail;
          if (stopError) throw stopError;
        }
      };
    }
  };
};
