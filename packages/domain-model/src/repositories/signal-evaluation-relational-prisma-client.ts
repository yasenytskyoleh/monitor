import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  composeSignalEvaluationRelationalRepositories,
  type SignalEvaluationRelationalRepositories
} from "./signal-evaluation-relational-repositories.js";
import { PrismaSignalEvaluationRelationalRepositoryAdapter } from "./signal-evaluation-relational-prisma-adapter.js";

export type SignalEvaluationRelationalPrismaRepositories = SignalEvaluationRelationalRepositories & {
  prismaClient: FirstDurableRelationalRuntimePrismaClient;
  adapter: PrismaSignalEvaluationRelationalRepositoryAdapter;
  disconnect(): Promise<void>;
};

export const createSignalEvaluationRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaSignalEvaluationRelationalRepositoryAdapter =>
  new PrismaSignalEvaluationRelationalRepositoryAdapter(client);

export const createSignalEvaluationRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): SignalEvaluationRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = createSignalEvaluationRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeSignalEvaluationRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
