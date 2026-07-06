import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter
} from "./setup-lifecycle-mutation-record-relational-prisma-adapter.js";
import {
  composeSetupLifecycleMutationRecordRelationalRepositories,
  type SetupLifecycleMutationRecordRelationalRepositories
} from "./setup-lifecycle-mutation-record-relational-repositories.js";

export type SetupLifecycleMutationRecordRelationalPrismaRepositories =
  SetupLifecycleMutationRecordRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createSetupLifecycleMutationRecordRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter =>
  new PrismaSetupLifecycleMutationRecordRelationalRepositoryAdapter(client);

export const createSetupLifecycleMutationRecordRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): SetupLifecycleMutationRecordRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter =
    createSetupLifecycleMutationRecordRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeSetupLifecycleMutationRecordRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
