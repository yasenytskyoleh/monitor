import type { PatternNotificationDeliveryService, ProductRecordMetadata } from "@monitor/domain-model";

import type {
  DeliverRetainedPatternNotificationResult,
  PatternNotificationDeliveryWorkflow
} from "./delivery-workflow.js";

export type PatternNotificationDeliveryDispatchPolicy = {
  minRunIntervalMs: number;
  maxDeliveriesPerRun: number;
};

export type DispatchPatternNotificationsRequest = {
  runAt: string;
  metadata: ProductRecordMetadata;
};

type DispatchDeliveryResult = {
  notificationId: string;
  status: DeliverRetainedPatternNotificationResult["status"];
};

export type DispatchPatternNotificationsResult =
  | {
      status: "completed";
      deliveries: DispatchDeliveryResult[];
    }
  | { status: "skipped_too_soon"; nextEligibleAt: string }
  | { status: "skipped_in_progress" }
  | { status: "rejected_validation" }
  | { status: "failed" };

export type PatternNotificationDeliveryDispatchOptions = {
  patternNotificationDeliveryService: PatternNotificationDeliveryService;
  deliveryWorkflow: PatternNotificationDeliveryWorkflow;
  policy: PatternNotificationDeliveryDispatchPolicy;
};

export type PatternNotificationDeliveryDispatch = {
  dispatch(
    request: DispatchPatternNotificationsRequest
  ): Promise<DispatchPatternNotificationsResult>;
};

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isValidTimestamp = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));

const isValidPolicy = (policy: PatternNotificationDeliveryDispatchPolicy): boolean =>
  isPositiveInteger(policy.minRunIntervalMs) &&
  isPositiveInteger(policy.maxDeliveriesPerRun);

const toDispatchDeliveryResult = (
  notificationId: string,
  result: DeliverRetainedPatternNotificationResult
): DispatchDeliveryResult => ({ notificationId, status: result.status });

export const createPatternNotificationDeliveryDispatch = (
  options: PatternNotificationDeliveryDispatchOptions
): PatternNotificationDeliveryDispatch => {
  if (!isValidPolicy(options.policy)) {
    throw new Error("Pattern notification delivery dispatch policy is invalid");
  }
  let lastRunAtMs: number | null = null;
  let dispatchInProgress = false;

  return {
    async dispatch(request) {
      if (!isValidTimestamp(request.runAt)) return { status: "rejected_validation" };
      const runAtMs = Date.parse(request.runAt);
      if (dispatchInProgress) return { status: "skipped_in_progress" };
      if (lastRunAtMs !== null && runAtMs < lastRunAtMs + options.policy.minRunIntervalMs) {
        return {
          status: "skipped_too_soon",
          nextEligibleAt: new Date(lastRunAtMs + options.policy.minRunIntervalMs).toISOString()
        };
      }
      dispatchInProgress = true;
      try {
        const pending = await options.patternNotificationDeliveryService.listByDeliveryStatus(
          ["pending_delivery"],
          options.policy.maxDeliveriesPerRun
        );
        const deliveries = await Promise.all(
          pending.map(async (notification): Promise<DispatchDeliveryResult> => {
            try {
              return toDispatchDeliveryResult(
                notification.notificationId,
                await options.deliveryWorkflow.deliver({
                  notificationId: notification.notificationId,
                  attemptedAt: request.runAt,
                  metadata: request.metadata,
                  expectedVersion: null
                })
              );
            } catch {
              return { notificationId: notification.notificationId, status: "outcome_unconfirmed" };
            }
          })
        );
        lastRunAtMs = runAtMs;
        return { status: "completed", deliveries };
      } catch {
        return { status: "failed" };
      } finally {
        dispatchInProgress = false;
      }
    }
  };
};
