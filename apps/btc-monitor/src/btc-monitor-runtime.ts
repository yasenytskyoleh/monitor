import {
  createActiveSetupRevisionResolutionHandoff,
  createSetupDefinitionService,
  createSignalCandidateFromDetectionHandoff,
  createSignalCandidateService,
  type ImplementedProductRelationalRepositories
} from "@monitor/domain-model";
import {
  CLOSED_CANDLE_BREAKOUT_RULE,
  createClosedCandlePatternDetectionFeed,
  createClosedCandlePatternDetectionRuntime,
  type ClosedCandleFeed,
  type ClosedCandlePatternDetectionFeedEvent,
  type ClosedCandleProcessingOutcome
} from "@monitor/pattern-detection";

import type { BtcMonitorConfiguration } from "./config.js";

type BtcMonitorRepositories = Pick<
  ImplementedProductRelationalRepositories,
  | "monitoredSymbolRepository"
  | "setupDefinitionRepository"
  | "setupDefinitionRevisionRepository"
  | "setupRevisionActivationRecordRepository"
  | "signalCandidateRepository"
>;

export type BtcMonitorRuntimeOptions = {
  candleFeed: ClosedCandleFeed;
  configuration: Pick<BtcMonitorConfiguration, "backfillStartTimeUtc" | "monitoredSymbolId" | "setupDefinitionId">;
  onDetection?(event: ClosedCandlePatternDetectionFeedEvent): Promise<void> | void;
  onError?(error: Error): Promise<void> | void;
  repositories: BtcMonitorRepositories;
};

export type BtcMonitorRuntime = {
  start(): Promise<{ stop(): Promise<void> }>;
};

const hasMeaningfulOutcome = (outcome: ClosedCandleProcessingOutcome): boolean =>
  outcome.status === "detected" || outcome.status === "failed" || outcome.status === "rejected";

export const createBtcMonitorRuntime = (options: BtcMonitorRuntimeOptions): BtcMonitorRuntime => {
  const setupDefinitionService = createSetupDefinitionService({
    setupDefinitionRepository: options.repositories.setupDefinitionRepository,
    setupDefinitionRevisionRepository: options.repositories.setupDefinitionRevisionRepository,
    setupRevisionActivationRecordRepository: options.repositories.setupRevisionActivationRecordRepository
  });
  const candidateHandoff = createSignalCandidateFromDetectionHandoff({
    signalCandidateService: createSignalCandidateService({
      signalCandidateRepository: options.repositories.signalCandidateRepository,
      setupDefinitionRepository: options.repositories.setupDefinitionRepository,
      monitoredSymbolRepository: options.repositories.monitoredSymbolRepository
    }),
    setupDefinitionService,
    signalCandidateRepository: options.repositories.signalCandidateRepository
  });
  const detectionRuntime = createClosedCandlePatternDetectionRuntime({
    detectors: [{
      setupDefinitionId: options.configuration.setupDefinitionId,
      monitoredSymbolId: options.configuration.monitoredSymbolId,
      timeframe: "5m",
      rule: CLOSED_CANDLE_BREAKOUT_RULE
    }],
    activeSetupRevisionResolver: createActiveSetupRevisionResolutionHandoff({ setupDefinitionService }),
    candidateHandoff
  });
  const detectionFeed = createClosedCandlePatternDetectionFeed({
    candleFeed: options.candleFeed,
    detectionRuntime,
    onError: options.onError,
    async onProcessed(event): Promise<void> {
      if (event.outcomes.some(hasMeaningfulOutcome)) await options.onDetection?.(event);
    }
  });

  return {
    async start() {
      return detectionFeed.start({ startTimeUtc: options.configuration.backfillStartTimeUtc });
    }
  };
};
