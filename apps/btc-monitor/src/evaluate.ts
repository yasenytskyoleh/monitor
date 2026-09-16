import process from "node:process";

import { createBinanceSpotCandleFeed, type BinanceSpotWebSocket } from "@monitor/binance-spot";
import {
  createImplementedProductRelationalPrismaRepositories,
  createScheduledJobRunService,
  PrismaScheduledJobRunRepository
} from "@monitor/domain-model";

import { createBtcEvaluationRunner } from "./btc-evaluation-runner.js";
import { loadBtcMonitorConfiguration } from "./config.js";
import { executeOwnedJob, OwnedJobExecutionError } from "./owned-job-executor.js";
import { createProcessTermination } from "./process-termination.js";

const createWebSocket = (url: string): BinanceSpotWebSocket => {
  if (!globalThis.WebSocket) throw new Error("This Node.js runtime does not provide a global WebSocket implementation");
  return new globalThis.WebSocket(url);
};

type EvaluationResults = Awaited<
  ReturnType<ReturnType<typeof createBtcEvaluationRunner>["run"]>
>;

const summarizeResults = (results: EvaluationResults) => {
  const counts = { completed: 0, failed: 0, not_due: 0, skipped: 0 };
  for (const result of results) counts[result.status] += 1;
  return {
    outcomeCode: counts.failed > 0 ? "completed_with_item_failures" : "completed",
    summary: { processed: results.length, ...counts }
  };
};

const run = async (): Promise<void> => {
  const configuration = loadBtcMonitorConfiguration(process.env);
  const jobName = "btc_evaluate" as const;
  const scopeKey = `${configuration.setupDefinitionId}:${configuration.monitoredSymbolId}`;
  const repositories = createImplementedProductRelationalPrismaRepositories({
    connectionString: configuration.databaseUrl,
    databaseSchema: configuration.databaseSchema
  });
  const termination = createProcessTermination();
  try {
    const outcome = await executeOwnedJob({
      jobName,
      scopeKey,
      scheduledJobRunService: createScheduledJobRunService(
        new PrismaScheduledJobRunRepository(repositories.prismaClient)
      ),
      signal: termination.signal,
      summarize: summarizeResults,
      execute: (signal) => createBtcEvaluationRunner({
        repositories,
        signal,
        setupDefinitionId: configuration.setupDefinitionId,
        monitoredSymbolId: configuration.monitoredSymbolId,
        candleSource: createBinanceSpotCandleFeed({ fetchImpl: fetch, createWebSocket })
      }).run()
    });
    if (outcome.status === "already_running") {
      process.stdout.write(`${JSON.stringify({
        kind: "btc_evaluation_run_skipped",
        status: outcome.status,
        jobName,
        scopeKey,
        activeRunId: outcome.activeRunId,
        leaseExpiresAtUtc: outcome.leaseExpiresAtUtc
      })}\n`);
      return;
    }
    process.stdout.write(`${JSON.stringify({
      kind: "btc_evaluation_run",
      scheduledJobRun: {
        runId: outcome.run.runId,
        jobName: outcome.run.jobName,
        scopeKey: outcome.run.scopeKey,
        status: outcome.run.status,
        outcomeCode: outcome.run.outcomeCode
      },
      results: outcome.result
    })}\n`);
  } finally {
    termination.dispose();
    await repositories.disconnect();
  }
};

void run().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    kind: "btc_evaluation_error",
    message: error instanceof Error ? error.message : "evaluation failed",
    jobName: "btc_evaluate",
    ...(error instanceof OwnedJobExecutionError
      ? { runId: error.runId, outcomeCode: error.outcomeCode }
      : { outcomeCode: "startup_failed" })
  })}\n`);
  process.exitCode = 1;
});
