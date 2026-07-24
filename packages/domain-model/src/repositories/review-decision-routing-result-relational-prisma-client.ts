import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaReviewDecisionRoutingResultRelationalRepositoryAdapter
} from "./review-decision-routing-result-relational-prisma-adapter.js";
import {
  composeReviewDecisionRoutingResultRelationalRepositories,
  type ReviewDecisionRoutingResultRelationalRepositories
} from "./review-decision-routing-result-relational-repositories.js";

export type ReviewDecisionRoutingResultRelationalPrismaRepositories =
  ReviewDecisionRoutingResultRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaReviewDecisionRoutingResultRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createReviewDecisionRoutingResultRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaReviewDecisionRoutingResultRelationalRepositoryAdapter =>
  new PrismaReviewDecisionRoutingResultRelationalRepositoryAdapter(client);

export const createReviewDecisionRoutingResultRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): ReviewDecisionRoutingResultRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = createReviewDecisionRoutingResultRelationalPrismaRepositoryAdapter(
    prismaClient
  );

  return {
    prismaClient,
    adapter,
    ...composeReviewDecisionRoutingResultRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
