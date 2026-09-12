const DEFAULT_BACKFILL_HOURS = 24;
const MAX_BACKFILL_HOURS = 24 * 30;

export type BtcMonitorConfiguration = {
  databaseSchema?: string;
  databaseUrl: string;
  backfillStartTimeUtc: string;
  monitoredSymbolId: string;
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
    databaseSchema: databaseSchema || undefined
  };
};
