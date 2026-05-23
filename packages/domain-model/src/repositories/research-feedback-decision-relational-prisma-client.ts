import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  composeResearchFeedbackDecisionRelationalRepositories,
  type ResearchFeedbackDecisionRelationalRepositories
} from "./research-feedback-decision-relational-repositories.js";
import {
  PrismaResearchFeedbackDecisionRelationalRepositoryAdapter
} from "./research-feedback-decision-relational-prisma-adapter.js";

export type ResearchFeedbackDecisionRelationalPrismaRepositories =
  ResearchFeedbackDecisionRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaResearchFeedbackDecisionRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createResearchFeedbackDecisionRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaResearchFeedbackDecisionRelationalRepositoryAdapter =>
  new PrismaResearchFeedbackDecisionRelationalRepositoryAdapter(client);

export const createResearchFeedbackDecisionRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): ResearchFeedbackDecisionRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = createResearchFeedbackDecisionRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeResearchFeedbackDecisionRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
