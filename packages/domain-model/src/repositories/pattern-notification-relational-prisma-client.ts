import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import { PrismaPatternNotificationRelationalRepositoryAdapter } from "./pattern-notification-relational-prisma-adapter.js";
import {
  composePatternNotificationRelationalRepositories,
  type PatternNotificationRelationalRepositories
} from "./pattern-notification-relational-repositories.js";

export type PatternNotificationRelationalPrismaRepositories =
  PatternNotificationRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaPatternNotificationRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createPatternNotificationRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaPatternNotificationRelationalRepositoryAdapter =>
  new PrismaPatternNotificationRelationalRepositoryAdapter(client);

export const createPatternNotificationRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): PatternNotificationRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = createPatternNotificationRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composePatternNotificationRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
