import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter
} from "./setup-revision-activation-record-relational-prisma-adapter.js";
import {
  composeSetupRevisionActivationRecordRelationalRepositories,
  type SetupRevisionActivationRecordRelationalRepositories
} from "./setup-revision-activation-record-relational-repositories.js";

export type SetupRevisionActivationRecordRelationalPrismaRepositories =
  SetupRevisionActivationRecordRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createSetupRevisionActivationRecordRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter =>
  new PrismaSetupRevisionActivationRecordRelationalRepositoryAdapter(client);

export const createSetupRevisionActivationRecordRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): SetupRevisionActivationRecordRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter =
    createSetupRevisionActivationRecordRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeSetupRevisionActivationRecordRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
