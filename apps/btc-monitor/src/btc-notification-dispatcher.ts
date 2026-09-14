import {
  createPatternNotificationDeliveryService,
  type PatternNotificationRecordRepository,
  type ProductRecordMetadata
} from "@monitor/domain-model";
import {
  createPatternNotificationDeliveryDispatch,
  createPatternNotificationDeliveryReconciliationRunner,
  createPatternNotificationDeliveryWorkflow,
  createTelegramPatternNotificationDeliveryPort,
  type DispatchPatternNotificationsResult,
  type PatternNotificationDeliveryPort,
  type ReconcilePatternNotificationsResult,
  type TelegramFetch
} from "@monitor/pattern-notification";

import type { BtcNotificationDeliveryConfiguration } from "./config.js";

const DELIVERY_OUTCOME_GRACE_MS = 5_000;

export type BtcNotificationDispatcherOptions = {
  configuration: BtcNotificationDeliveryConfiguration;
  fetchImpl: TelegramFetch;
  now?: () => string;
  patternNotificationRecordRepository: PatternNotificationRecordRepository;
};

export type BtcNotificationDispatcher = {
  dispatch(): Promise<BtcNotificationDispatchResult>;
};

export type BtcNotificationDispatchResult = {
  dispatch: DispatchPatternNotificationsResult;
  reconciliation: ReconcilePatternNotificationsResult;
};

const buildMetadata = (observedAt: string): ProductRecordMetadata => ({
  originRunId: null,
  originTransitionId: null,
  createdBySource: "notification_pipeline",
  lastUpdatedBySource: "notification_pipeline",
  traceId: null,
  sourceObservedAtUtc: observedAt,
  notes: "BTC Telegram notification delivery run"
});

const isStaleAtDelivery = (observedAt: string, deliveredAt: string, maxSignalAgeMs: number): boolean =>
  Date.parse(deliveredAt) - Date.parse(observedAt) > maxSignalAgeMs;

const createFreshTelegramDeliveryPort = (
  options: Pick<BtcNotificationDispatcherOptions, "configuration" | "fetchImpl"> & {
    now: () => string;
  }
): PatternNotificationDeliveryPort => {
  const telegramDeliveryPort = createTelegramPatternNotificationDeliveryPort({
    botToken: options.configuration.telegramBotToken,
    chatId: options.configuration.telegramChatId,
    fetch: options.fetchImpl,
    timeoutMs: options.configuration.telegramTimeoutMs,
    now: options.now
  });

  return {
    maxExecutionMs: telegramDeliveryPort.maxExecutionMs,
    async deliver(request) {
      const completedAt = options.now();
      if (
        isStaleAtDelivery(
          request.notification.observedAt,
          completedAt,
          options.configuration.maxSignalAgeMs
        )
      ) {
        return { status: "failed", completedAt, outcomeCode: "notification_stale" };
      }
      return telegramDeliveryPort.deliver(request);
    }
  };
};

export const createBtcNotificationDispatcher = (
  options: BtcNotificationDispatcherOptions
): BtcNotificationDispatcher => {
  const now = options.now ?? (() => new Date().toISOString());
  const patternNotificationDeliveryService = createPatternNotificationDeliveryService({
    patternNotificationRecordRepository: options.patternNotificationRecordRepository
  });
  const deliveryPort = createFreshTelegramDeliveryPort({ ...options, now });
  const deliveryWorkflow = createPatternNotificationDeliveryWorkflow({
    patternNotificationDeliveryService,
    deliveryPort,
    deliveryLeaseDurationMs: options.configuration.telegramTimeoutMs + DELIVERY_OUTCOME_GRACE_MS,
    deliveryLeaseOutcomeGraceMs: DELIVERY_OUTCOME_GRACE_MS,
    now
  });
  const deliveryDispatch = createPatternNotificationDeliveryDispatch({
    patternNotificationDeliveryService,
    deliveryWorkflow,
    policy: {
      minRunIntervalMs: 1,
      maxDeliveriesPerRun: options.configuration.maxDeliveriesPerRun
    }
  });
  const deliveryReconciliation = createPatternNotificationDeliveryReconciliationRunner({
    patternNotificationDeliveryService,
    policy: {
      minRunIntervalMs: 1,
      maxReconciliationsPerRun: options.configuration.maxDeliveriesPerRun,
      minAttemptAgeMs: options.configuration.telegramTimeoutMs + DELIVERY_OUTCOME_GRACE_MS,
      leaseClockSkewToleranceMs: DELIVERY_OUTCOME_GRACE_MS
    },
    now
  });

  return {
    async dispatch(): Promise<BtcNotificationDispatchResult> {
      const runAt = now();
      const metadata = buildMetadata(runAt);
      const reconciliation = await deliveryReconciliation.reconcile({ metadata });
      const dispatch = await deliveryDispatch.dispatch({ runAt, metadata });
      return { reconciliation, dispatch };
    }
  };
};
