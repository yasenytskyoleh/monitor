import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaSetupDefinitionRevisionRelationalRepositoryAdapter
} from "./setup-definition-revision-relational-prisma-adapter.js";
import {
  composeSetupDefinitionRevisionRelationalRepositories,
  type SetupDefinitionRevisionRelationalRepositories
} from "./setup-definition-revision-relational-repositories.js";

export type SetupDefinitionRevisionRelationalPrismaRepositories =
  SetupDefinitionRevisionRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaSetupDefinitionRevisionRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createSetupDefinitionRevisionRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaSetupDefinitionRevisionRelationalRepositoryAdapter =>
  new PrismaSetupDefinitionRevisionRelationalRepositoryAdapter(client);

export const createSetupDefinitionRevisionRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): SetupDefinitionRevisionRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter =
    createSetupDefinitionRevisionRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeSetupDefinitionRevisionRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
