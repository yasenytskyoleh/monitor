import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaSetupRefinementRequestRelationalRepositoryAdapter
} from "./setup-refinement-request-relational-prisma-adapter.js";
import {
  composeSetupRefinementRequestRelationalRepositories,
  type SetupRefinementRequestRelationalRepositories
} from "./setup-refinement-request-relational-repositories.js";

export type SetupRefinementRequestRelationalPrismaRepositories =
  SetupRefinementRequestRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaSetupRefinementRequestRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createSetupRefinementRequestRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaSetupRefinementRequestRelationalRepositoryAdapter =>
  new PrismaSetupRefinementRequestRelationalRepositoryAdapter(client);

export const createSetupRefinementRequestRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): SetupRefinementRequestRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter =
    createSetupRefinementRequestRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeSetupRefinementRequestRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
