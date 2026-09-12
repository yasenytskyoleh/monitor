const DEFAULT_BACKFILL_HOURS = 24;
const MAX_BACKFILL_HOURS = 24 * 30;
const DEFAULT_NOTIFICATION_MIN_COMPLETED_EVALUATIONS = 30;
const DEFAULT_NOTIFICATION_MIN_POSITIVE_OUTCOME_RATE = 0.6;
const DEFAULT_NOTIFICATION_MIN_AVERAGE_PERCENTAGE_MOVE = 0.5;
const DEFAULT_NOTIFICATION_MAX_SIGNAL_AGE_MINUTES = 15;
const DEFAULT_NOTIFICATION_MAX_AGGREGATE_AGE_HOURS = 24;

export type BtcNotificationPolicyConfiguration = {
  policyId: string;
  minCompletedEvaluations: number;
  minPositiveOutcomeRate: number;
  minAveragePercentageMove: number;
  maxSignalAgeMs: number;
  maxAggregateAgeMs: number;
};

export const DEFAULT_BTC_NOTIFICATION_POLICY: BtcNotificationPolicyConfiguration = {
  policyId: "btc-breakout-conservative-v1",
  minCompletedEvaluations: DEFAULT_NOTIFICATION_MIN_COMPLETED_EVALUATIONS,
  minPositiveOutcomeRate: DEFAULT_NOTIFICATION_MIN_POSITIVE_OUTCOME_RATE,
  minAveragePercentageMove: DEFAULT_NOTIFICATION_MIN_AVERAGE_PERCENTAGE_MOVE,
  maxSignalAgeMs: DEFAULT_NOTIFICATION_MAX_SIGNAL_AGE_MINUTES * 60 * 1_000,
  maxAggregateAgeMs: DEFAULT_NOTIFICATION_MAX_AGGREGATE_AGE_HOURS * 60 * 60 * 1_000
};

export type BtcMonitorConfiguration = {
  databaseSchema?: string;
  databaseUrl: string;
  backfillStartTimeUtc: string;
  monitoredSymbolId: string;
  notificationPolicy: BtcNotificationPolicyConfiguration;
  setupDefinitionId: string;
};

export class BtcMonitorConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BtcMonitorConfigurationError";
  }
}

const requireEnvironmentValue = (environment: NodeJS.ProcessEnv, key: string): string => {
  const value = environment[key]?.trim();
  if (!value) throw new BtcMonitorConfigurationError(`${key} is required`);
  return value;
};

const parseBackfillHours = (value: string | undefined): number => {
  if (!value?.trim()) return DEFAULT_BACKFILL_HOURS;
  const hours = Number(value);
  if (!Number.isInteger(hours) || hours < 1 || hours > MAX_BACKFILL_HOURS) {
    throw new BtcMonitorConfigurationError(
      `BTC_MONITOR_BACKFILL_HOURS must be an integer between 1 and ${MAX_BACKFILL_HOURS}`
    );
  }
  return hours;
};

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  key: string,
  maximum: number
): number => {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new BtcMonitorConfigurationError(`${key} must be an integer between 1 and ${maximum}`);
  }
  return parsed;
};

const parsePercentage = (value: string | undefined, fallback: number, key: string): number => {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new BtcMonitorConfigurationError(`${key} must be a number between 0 and 1`);
  }
  return parsed;
};

const parseNonNegativeNumber = (value: string | undefined, fallback: number, key: string): number => {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new BtcMonitorConfigurationError(`${key} must be a non-negative number`);
  }
  return parsed;
};

const loadNotificationPolicy = (environment: NodeJS.ProcessEnv): BtcNotificationPolicyConfiguration => ({
  policyId: environment.BTC_MONITOR_NOTIFICATION_POLICY_ID?.trim() || DEFAULT_BTC_NOTIFICATION_POLICY.policyId,
  minCompletedEvaluations: parsePositiveInteger(
    environment.BTC_MONITOR_NOTIFICATION_MIN_COMPLETED_EVALUATIONS,
    DEFAULT_NOTIFICATION_MIN_COMPLETED_EVALUATIONS,
    "BTC_MONITOR_NOTIFICATION_MIN_COMPLETED_EVALUATIONS",
    10_000
  ),
  minPositiveOutcomeRate: parsePercentage(
    environment.BTC_MONITOR_NOTIFICATION_MIN_POSITIVE_OUTCOME_RATE,
    DEFAULT_NOTIFICATION_MIN_POSITIVE_OUTCOME_RATE,
    "BTC_MONITOR_NOTIFICATION_MIN_POSITIVE_OUTCOME_RATE"
  ),
  minAveragePercentageMove: parseNonNegativeNumber(
    environment.BTC_MONITOR_NOTIFICATION_MIN_AVERAGE_PERCENTAGE_MOVE,
    DEFAULT_NOTIFICATION_MIN_AVERAGE_PERCENTAGE_MOVE,
    "BTC_MONITOR_NOTIFICATION_MIN_AVERAGE_PERCENTAGE_MOVE"
  ),
  maxSignalAgeMs: parsePositiveInteger(
    environment.BTC_MONITOR_NOTIFICATION_MAX_SIGNAL_AGE_MINUTES,
    DEFAULT_NOTIFICATION_MAX_SIGNAL_AGE_MINUTES,
    "BTC_MONITOR_NOTIFICATION_MAX_SIGNAL_AGE_MINUTES",
    24 * 60
  ) * 60 * 1_000,
  maxAggregateAgeMs: parsePositiveInteger(
    environment.BTC_MONITOR_NOTIFICATION_MAX_AGGREGATE_AGE_HOURS,
    DEFAULT_NOTIFICATION_MAX_AGGREGATE_AGE_HOURS,
    "BTC_MONITOR_NOTIFICATION_MAX_AGGREGATE_AGE_HOURS",
    24 * 30
  ) * 60 * 60 * 1_000
});

export const loadBtcMonitorConfiguration = (
  environment: NodeJS.ProcessEnv,
  now: Date = new Date()
): BtcMonitorConfiguration => {
  const backfillHours = parseBackfillHours(environment.BTC_MONITOR_BACKFILL_HOURS);
  const databaseSchema = environment.BTC_MONITOR_DATABASE_SCHEMA?.trim();
  return {
    databaseUrl: requireEnvironmentValue(environment, "DATABASE_URL"),
    setupDefinitionId: requireEnvironmentValue(environment, "BTC_MONITOR_SETUP_DEFINITION_ID"),
    monitoredSymbolId: environment.BTC_MONITOR_MONITORED_SYMBOL_ID?.trim() || "BTC-USDT",
    backfillStartTimeUtc: new Date(now.getTime() - backfillHours * 60 * 60 * 1_000).toISOString(),
    notificationPolicy: loadNotificationPolicy(environment),
    databaseSchema: databaseSchema || undefined
  };
};
