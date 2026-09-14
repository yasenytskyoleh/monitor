import process from "node:process";

import {
  createImplementedProductRelationalPrismaRepositories,
  createScheduledJobRunService,
  PrismaScheduledJobRunRepository,
  PrismaPatternNotificationRecordRepository
} from "@monitor/domain-model";
import type { TelegramFetch } from "@monitor/pattern-notification";

import { createBtcNotificationDispatcher } from "./btc-notification-dispatcher.js";
import { loadBtcNotificationDeliveryConfiguration } from "./config.js";
import { executeOwnedJob, OwnedJobExecutionError } from "./owned-job-executor.js";
import { createProcessTermination } from "./process-termination.js";

const telegramFetch: TelegramFetch = async (input, init) => fetch(input, init);

type NotificationResult = Awaited<
  ReturnType<ReturnType<typeof createBtcNotificationDispatcher>["dispatch"]>
>;

const countStatuses = (statuses: string[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const status of statuses) counts[status] = (counts[status] ?? 0) + 1;
  return counts;
};

const summarizeResult = (result: NotificationResult) => {
  const reconciliationStatuses = result.reconciliation.status === "completed"
    ? result.reconciliation.reconciliations.map(({ status }) => status)
    : [result.reconciliation.status];
  const deliveryStatuses = result.dispatch.status === "completed"
    ? result.dispatch.deliveries.map(({ status }) => status)
    : [result.dispatch.status];
  const hasFailures = [...reconciliationStatuses, ...deliveryStatuses].some((status) =>
    status === "failed" || status === "outcome_unconfirmed" || status === "rejected_validation"
  );
  return {
    outcomeCode: hasFailures ? "completed_with_item_failures" : "completed",
    summary: {
      reconciliation: countStatuses(reconciliationStatuses),
      delivery: countStatuses(deliveryStatuses)
    }
  };
};

const run = async (): Promise<void> => {
  const configuration = loadBtcNotificationDeliveryConfiguration(process.env);
  const jobName = "btc_notify" as const;
  const scopeKey = "global";
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
      summarize: summarizeResult,
      execute: (signal) => createBtcNotificationDispatcher({
        configuration,
        fetchImpl: telegramFetch,
        signal,
        patternNotificationRecordRepository: new PrismaPatternNotificationRecordRepository(
          repositories.prismaClient
        )
      }).dispatch()
    });
    if (outcome.status === "already_running") {
      process.stdout.write(`${JSON.stringify({
        kind: "btc_notification_dispatch_skipped",
        status: outcome.status,
        jobName,
        scopeKey,
        activeRunId: outcome.activeRunId,
        leaseExpiresAtUtc: outcome.leaseExpiresAtUtc
      })}\n`);
      return;
    }
    process.stdout.write(`${JSON.stringify({
      kind: "btc_notification_dispatch",
      scheduledJobRun: {
        runId: outcome.run.runId,
        jobName: outcome.run.jobName,
        scopeKey: outcome.run.scopeKey,
        status: outcome.run.status,
        outcomeCode: outcome.run.outcomeCode
      },
      result: outcome.result
    })}\n`);
  } finally {
    termination.dispose();
    await repositories.disconnect();
  }
};

void run().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    kind: "btc_notification_dispatch_error",
    message: error instanceof Error ? error.message : "notification dispatch failed",
    jobName: "btc_notify",
    scopeKey: "global",
    ...(error instanceof OwnedJobExecutionError
      ? { runId: error.runId, outcomeCode: error.outcomeCode }
      : { outcomeCode: "startup_failed" })
  })}\n`);
  process.exitCode = 1;
});
