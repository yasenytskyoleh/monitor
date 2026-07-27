import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaResearchRunRelationalRepositoryAdapter
} from "./research-run-relational-prisma-adapter.js";
import {
  composeResearchRunRelationalRepositories,
  type ResearchRunRelationalRepositories
} from "./research-run-relational-repositories.js";

export type ResearchRunRelationalPrismaRepositories =
  ResearchRunRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaResearchRunRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createResearchRunRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaResearchRunRelationalRepositoryAdapter =>
  new PrismaResearchRunRelationalRepositoryAdapter(client);

export const createResearchRunRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): ResearchRunRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = createResearchRunRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeResearchRunRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
