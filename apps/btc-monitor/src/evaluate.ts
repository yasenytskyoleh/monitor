import process from "node:process";

import { createBinanceSpotCandleFeed, type BinanceSpotWebSocket } from "@monitor/binance-spot";
import { createImplementedProductRelationalPrismaRepositories } from "@monitor/domain-model";

import { createBtcEvaluationRunner } from "./btc-evaluation-runner.js";
import { loadBtcMonitorConfiguration } from "./config.js";

const createWebSocket = (url: string): BinanceSpotWebSocket => {
  if (!globalThis.WebSocket) throw new Error("This Node.js runtime does not provide a global WebSocket implementation");
  return new globalThis.WebSocket(url);
};

const run = async (): Promise<void> => {
  const configuration = loadBtcMonitorConfiguration(process.env);
  const repositories = createImplementedProductRelationalPrismaRepositories({
    connectionString: configuration.databaseUrl,
    databaseSchema: configuration.databaseSchema
  });
  try {
    const results = await createBtcEvaluationRunner({
      repositories,
      setupDefinitionId: configuration.setupDefinitionId,
      monitoredSymbolId: configuration.monitoredSymbolId,
      candleSource: createBinanceSpotCandleFeed({ fetchImpl: fetch, createWebSocket })
    }).run();
    process.stdout.write(`${JSON.stringify({ kind: "btc_evaluation_run", results })}\n`);
  } finally {
    await repositories.disconnect();
  }
};

void run().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({ kind: "btc_evaluation_error", message: error instanceof Error ? error.message : "evaluation failed" })}\n`);
  process.exitCode = 1;
});
