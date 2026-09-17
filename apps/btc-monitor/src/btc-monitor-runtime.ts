import {
  createActiveSetupRevisionResolutionHandoff,
  createPatternNotificationDeliveryService,
  createSetupDefinitionService,
  createSignalCandidateFromDetectionHandoff,
  createSignalCandidateService,
  type ImplementedProductRelationalRepositories,
  type PatternNotificationRecordRepository
} from "@monitor/domain-model";
import {
  CLOSED_CANDLE_BREAKOUT_RULE,
  createClosedCandlePatternDetectionFeed,
  createClosedCandlePatternDetectionRuntime,
  type ClosedCandleFeed,
  type ClosedCandlePatternDetectionFeedEvent,
  type ClosedCandleProcessingOutcome
} from "@monitor/pattern-detection";
import {
  createPatternNotificationEligibilityRuntime,
  createPatternNotificationRetentionRuntime,
  type PatternNotificationEligibilityResult,
  type RetainEligiblePatternNotificationResult
} from "@monitor/pattern-notification";

import { createBtcAggregateScope } from "./btc-aggregate-scope.js";
import { DEFAULT_BTC_NOTIFICATION_POLICY, type BtcMonitorConfiguration } from "./config.js";

export type BtcMonitorRepositories = Pick<
  ImplementedProductRelationalRepositories,
  | "monitoredSymbolRepository"
  | "setupDefinitionRepository"
  | "setupDefinitionRevisionRepository"
  | "setupRevisionActivationRecordRepository"
  | "setupAggregateResultRepository"
  | "signalCandidateRepository"
> & {
  patternNotificationRecordRepository: PatternNotificationRecordRepository;
};

export type BtcNotificationRetentionOutcome = {
  eligibility: PatternNotificationEligibilityResult;
  retention?: RetainEligiblePatternNotificationResult;
  signalCandidateId: string;
};

export type BtcMonitorRuntimeOptions = {
  candleFeed: ClosedCandleFeed;
  configuration: Pick<
    BtcMonitorConfiguration,
    "backfillStartTimeUtc" | "monitoredSymbolId" | "setupDefinitionId"
  > & Partial<Pick<BtcMonitorConfiguration, "notificationPolicy">>;
  onDetection?(event: ClosedCandlePatternDetectionFeedEvent): Promise<void> | void;
  onError?(error: Error): Promise<void> | void;
  onNotification?(outcome: BtcNotificationRetentionOutcome): Promise<void> | void;
  onProcessed?(event: ClosedCandlePatternDetectionFeedEvent): Promise<void> | void;
  onProcessingFailure?(event: ClosedCandlePatternDetectionFeedEvent): Promise<void> | void;
  repositories: BtcMonitorRepositories;
};

export type BtcMonitorRuntime = {
  start(): Promise<{ stop(): Promise<void> }>;
};

const hasMeaningfulOutcome = (outcome: ClosedCandleProcessingOutcome): boolean =>
  outcome.status === "detected" || outcome.status === "failed" || outcome.status === "rejected";

const notificationMetadata = (observedAt: string, traceId: string) => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "notification_pipeline" as const,
  lastUpdatedBySource: "notification_pipeline" as const,
  traceId,
  sourceObservedAtUtc: observedAt,
  notes: "BTC pattern notification retained after historical-evidence eligibility"
});

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
  const notificationEligibilityRuntime = createPatternNotificationEligibilityRuntime({
    signalCandidateRepository: options.repositories.signalCandidateRepository,
    setupAggregateResultRepository: options.repositories.setupAggregateResultRepository,
    policy: options.configuration.notificationPolicy ?? DEFAULT_BTC_NOTIFICATION_POLICY
  });
  const notificationRetentionRuntime = createPatternNotificationRetentionRuntime({
    patternNotificationDeliveryService: createPatternNotificationDeliveryService({
      patternNotificationRecordRepository: options.repositories.patternNotificationRecordRepository
    })
  });
  const retainEligibleNotifications = async (
    event: ClosedCandlePatternDetectionFeedEvent
  ): Promise<void> => {
    for (const outcome of event.outcomes) {
      const signalCandidateId = outcome.handoffResult?.signalCandidateId;
      if (
        outcome.status !== "detected" ||
        (outcome.handoffResult?.status !== "created" &&
          outcome.handoffResult?.status !== "rejected_duplicate") ||
        !signalCandidateId
      ) {
        continue;
      }

      try {
        const candidate = await options.repositories.signalCandidateRepository.getById(signalCandidateId);
        if (!candidate) {
          await options.onNotification?.({
            signalCandidateId,
            eligibility: {
              status: "rejected_validation",
              reason: "signal_candidate not found after detection handoff",
              warnings: []
            }
          });
          continue;
        }
        const aggregate = await options.repositories.setupAggregateResultRepository
          .getBySetupDefinitionAndScope(
            candidate.setupDefinitionId,
            createBtcAggregateScope(candidate.setupDefinitionId, candidate.monitoredSymbolId)
          );
        if (!aggregate) {
          await options.onNotification?.({
            signalCandidateId,
            eligibility: {
              status: "ineligible",
              reason: "setup_aggregate_result_unavailable",
              warnings: []
            }
          });
          continue;
        }
        const eligibility = await notificationEligibilityRuntime.assess({
          signalCandidateId,
          setupAggregateResultId: aggregate.id,
          direction: "consider_long",
          observedAt: event.candle.eventTimestampUtc,
          currentPrice: event.candle.payload.close
        });
        if (eligibility.status !== "eligible") {
          await options.onNotification?.({ signalCandidateId, eligibility });
          continue;
        }
        const retention = await notificationRetentionRuntime.retain({
          candidate: eligibility.candidate,
          retainedAt: event.candle.eventTimestampUtc,
          metadata: notificationMetadata(event.candle.eventTimestampUtc, event.candle.eventId)
        });
        await options.onNotification?.({ signalCandidateId, eligibility, retention });
      } catch (error: unknown) {
        await options.onNotification?.({
          signalCandidateId,
          eligibility: {
            status: "failed",
            reason: error instanceof Error ? error.message : "unexpected notification retention failure",
            warnings: ["notification retention can be retried after resolving the runtime failure"]
          }
        });
      }
    }
  };
  const detectionFeed = createClosedCandlePatternDetectionFeed({
    candleFeed: options.candleFeed,
    detectionRuntime,
    onError: options.onError,
    async onProcessed(event): Promise<void> {
      await retainEligibleNotifications(event);
      await options.onProcessed?.(event);
      if (event.outcomes.some(hasMeaningfulOutcome)) await options.onDetection?.(event);
      if (event.outcomes.some((outcome) => outcome.status === "failed")) {
        await options.onProcessingFailure?.(event);
      }
    }
  });

  return {
    async start() {
      return detectionFeed.start({ startTimeUtc: options.configuration.backfillStartTimeUtc });
    }
  };
};
