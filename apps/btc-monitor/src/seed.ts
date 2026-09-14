import process from "node:process";

import {
  createImplementedProductRelationalPrismaRepositories,
  type FirstDurableRelationalPrismaClientOptions
} from "@monitor/domain-model";

import { seedBtcPilot } from "./btc-pilot-seed.js";
import { loadBtcMonitorConfiguration } from "./config.js";

export const runBtcPilotSeed = async (
  environment: NodeJS.ProcessEnv = process.env,
  logger: Pick<Console, "error" | "info"> = console
): Promise<void> => {
  const configuration = loadBtcMonitorConfiguration(environment);
  const persistenceOptions: FirstDurableRelationalPrismaClientOptions = {
    connectionString: configuration.databaseUrl,
    databaseSchema: configuration.databaseSchema
  };
  const repositories = createImplementedProductRelationalPrismaRepositories(persistenceOptions);
  try {
    const result = await seedBtcPilot({
      repositories,
      setupDefinitionId: configuration.setupDefinitionId,
      monitoredSymbolId: configuration.monitoredSymbolId
    });
    logger.info(JSON.stringify({ kind: "btc_pilot_seed_completed", ...result }));
  } finally {
    await repositories.disconnect();
  }
};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  void runBtcPilotSeed().catch((error: unknown) => {
    console.error(JSON.stringify({
      kind: "btc_pilot_seed_failed",
      message: error instanceof Error ? error.message : "BTC pilot seed failed"
    }));
    process.exitCode = 1;
  });
}
