import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaResearchReviewDecisionRelationalRepositoryAdapter
} from "./research-review-decision-relational-prisma-adapter.js";
import {
  composeResearchReviewDecisionRelationalRepositories,
  type ResearchReviewDecisionRelationalRepositories
} from "./research-review-decision-relational-repositories.js";

export type ResearchReviewDecisionRelationalPrismaRepositories =
  ResearchReviewDecisionRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaResearchReviewDecisionRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createResearchReviewDecisionRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaResearchReviewDecisionRelationalRepositoryAdapter =>
  new PrismaResearchReviewDecisionRelationalRepositoryAdapter(client);

export const createResearchReviewDecisionRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): ResearchReviewDecisionRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = createResearchReviewDecisionRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeResearchReviewDecisionRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
