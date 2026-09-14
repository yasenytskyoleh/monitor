import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaPatternNotificationRecordRepository
} from "./pattern-notification-record-repository.prisma.js";

export type PatternNotificationRecordPrismaRepositories = {
  prismaClient: FirstDurableRelationalRuntimePrismaClient;
  patternNotificationRecordRepository: PrismaPatternNotificationRecordRepository;
  disconnect(): Promise<void>;
};

export const createPatternNotificationRecordPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): PatternNotificationRecordPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  return {
    prismaClient,
    patternNotificationRecordRepository: new PrismaPatternNotificationRecordRepository(prismaClient),
    disconnect: async () => prismaClient.$disconnect()
  };
};
