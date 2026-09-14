import process from "node:process";

import {
  createImplementedProductRelationalPrismaRepositories,
  PrismaPatternNotificationRecordRepository
} from "@monitor/domain-model";
import type { TelegramFetch } from "@monitor/pattern-notification";

import { createBtcNotificationDispatcher } from "./btc-notification-dispatcher.js";
import { loadBtcNotificationDeliveryConfiguration } from "./config.js";

const telegramFetch: TelegramFetch = async (input, init) => fetch(input, init);

const run = async (): Promise<void> => {
  const configuration = loadBtcNotificationDeliveryConfiguration(process.env);
  const repositories = createImplementedProductRelationalPrismaRepositories({
    connectionString: configuration.databaseUrl,
    databaseSchema: configuration.databaseSchema
  });
  try {
    const result = await createBtcNotificationDispatcher({
      configuration,
      fetchImpl: telegramFetch,
      patternNotificationRecordRepository: new PrismaPatternNotificationRecordRepository(
        repositories.prismaClient
      )
    }).dispatch();
    process.stdout.write(`${JSON.stringify({ kind: "btc_notification_dispatch", result })}\n`);
  } finally {
    await repositories.disconnect();
  }
};

void run().catch((error: unknown) => {
  process.stderr.write(`${JSON.stringify({
    kind: "btc_notification_dispatch_error",
    message: error instanceof Error ? error.message : "notification dispatch failed"
  })}\n`);
  process.exitCode = 1;
});
