import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  composeSetupAggregateRelationalRepositories,
  type SetupAggregateRelationalRepositories
} from "./setup-aggregate-relational-repositories.js";
import { PrismaSetupAggregateRelationalRepositoryAdapter } from "./setup-aggregate-relational-prisma-adapter.js";

export type SetupAggregateRelationalPrismaRepositories = SetupAggregateRelationalRepositories & {
  prismaClient: FirstDurableRelationalRuntimePrismaClient;
  adapter: PrismaSetupAggregateRelationalRepositoryAdapter;
  disconnect(): Promise<void>;
};

export const createSetupAggregateRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaSetupAggregateRelationalRepositoryAdapter =>
  new PrismaSetupAggregateRelationalRepositoryAdapter(client);

export const createSetupAggregateRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): SetupAggregateRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = createSetupAggregateRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeSetupAggregateRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
