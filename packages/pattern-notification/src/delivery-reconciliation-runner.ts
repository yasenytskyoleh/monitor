import type { PatternNotificationDeliveryService, ProductRecordMetadata } from "@monitor/domain-model";

export type PatternNotificationDeliveryReconciliationPolicy = {
  minRunIntervalMs: number;
  maxReconciliationsPerRun: number;
  minAttemptAgeMs: number;
  leaseClockSkewToleranceMs: number;
};

export type ReconcilePatternNotificationsRequest = {
  metadata: ProductRecordMetadata;
};

type ReconciliationResult = {
  notificationId: string;
  status:
    | "already_terminal"
    | "failed"
    | "lease_active"
    | "not_found"
    | "not_stale"
    | "reconciled";
};

export type ReconcilePatternNotificationsResult =
  | { status: "completed"; reconciliations: ReconciliationResult[] }
  | { status: "skipped_too_soon"; nextEligibleAt: string }
  | { status: "skipped_in_progress" }
  | { status: "rejected_validation" }
  | { status: "failed" };

export type PatternNotificationDeliveryReconciliationRunnerOptions = {
  patternNotificationDeliveryService: PatternNotificationDeliveryService;
  policy: PatternNotificationDeliveryReconciliationPolicy;
  now?: () => string;
};

export type PatternNotificationDeliveryReconciliationRunner = {
  reconcile(
    request: ReconcilePatternNotificationsRequest
  ): Promise<ReconcilePatternNotificationsResult>;
};

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const isValidTimestamp = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && Number.isFinite(Date.parse(value));

const isValidPolicy = (policy: PatternNotificationDeliveryReconciliationPolicy): boolean =>
  isPositiveInteger(policy.minRunIntervalMs) &&
  isPositiveInteger(policy.maxReconciliationsPerRun) &&
  isPositiveInteger(policy.minAttemptAgeMs) &&
  isPositiveInteger(policy.leaseClockSkewToleranceMs);

export const createPatternNotificationDeliveryReconciliationRunner = (
  options: PatternNotificationDeliveryReconciliationRunnerOptions
): PatternNotificationDeliveryReconciliationRunner => {
  if (!isValidPolicy(options.policy)) {
    throw new Error("Pattern notification delivery reconciliation policy is invalid");
  }
  const now = options.now ?? (() => new Date().toISOString());
  let lastRunAtMs: number | null = null;
  let reconciliationInProgress = false;

  return {
    async reconcile(request) {
      let reconciledAt: string;
      try {
        reconciledAt = now();
      } catch {
        return { status: "rejected_validation" };
      }
      if (!isValidTimestamp(reconciledAt)) return { status: "rejected_validation" };
      const reconciledAtMs = Date.parse(reconciledAt);
      if (reconciliationInProgress) return { status: "skipped_in_progress" };
      if (
        lastRunAtMs !== null &&
        reconciledAtMs < lastRunAtMs + options.policy.minRunIntervalMs
      ) {
        return {
          status: "skipped_too_soon",
          nextEligibleAt: new Date(
            lastRunAtMs + options.policy.minRunIntervalMs
          ).toISOString()
        };
      }

      reconciliationInProgress = true;
      try {
        const attempted = await options.patternNotificationDeliveryService.listByDeliveryStatus(
          ["delivery_attempted"],
          options.policy.maxReconciliationsPerRun
        );
        const reconciliations = await Promise.all(
          attempted.map(async ({ notificationId }): Promise<ReconciliationResult> => {
            try {
              const result = await options.patternNotificationDeliveryService.reconcileUnconfirmedDelivery({
                notificationId,
                reconciledAt,
                minAttemptAgeMs: options.policy.minAttemptAgeMs,
                leaseClockSkewToleranceMs: options.policy.leaseClockSkewToleranceMs,
                metadata: request.metadata,
                expectedVersion: null
              });
              return { notificationId, status: result.status };
            } catch {
              return { notificationId, status: "failed" };
            }
          })
        );
        lastRunAtMs = reconciledAtMs;
        return { status: "completed", reconciliations };
      } catch {
        return { status: "failed" };
      } finally {
        reconciliationInProgress = false;
      }
    }
  };
};
