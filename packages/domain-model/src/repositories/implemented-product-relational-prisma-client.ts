import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import { PrismaFirstDurableRelationalRepositoryAdapter } from "./first-durable-relational-prisma-adapter.js";
import {
  composeImplementedProductRelationalRepositories,
  type ImplementedProductRelationalAdapters,
  type ImplementedProductRelationalRepositories
} from "./implemented-product-relational-repositories.js";
import { createResearchFeedbackDecisionRelationalPrismaRepositoryAdapter } from "./research-feedback-decision-relational-prisma-client.js";
import { type PrismaResearchFeedbackDecisionRelationalRepositoryAdapter } from "./research-feedback-decision-relational-prisma-adapter.js";
import { createSetupAggregateRelationalPrismaRepositoryAdapter } from "./setup-aggregate-relational-prisma-client.js";
import { type PrismaSetupAggregateRelationalRepositoryAdapter } from "./setup-aggregate-relational-prisma-adapter.js";
import { createSignalEvaluationRelationalPrismaRepositoryAdapter } from "./signal-evaluation-relational-prisma-client.js";
import { type PrismaSignalEvaluationRelationalRepositoryAdapter } from "./signal-evaluation-relational-prisma-adapter.js";

export type ImplementedProductRelationalPrismaAdapters = ImplementedProductRelationalAdapters & {
  firstDurableAdapter: PrismaFirstDurableRelationalRepositoryAdapter;
  signalEvaluationAdapter: PrismaSignalEvaluationRelationalRepositoryAdapter;
  setupAggregateAdapter: PrismaSetupAggregateRelationalRepositoryAdapter;
  feedbackDecisionAdapter: PrismaResearchFeedbackDecisionRelationalRepositoryAdapter;
};

export type ImplementedProductRelationalPrismaRepositories =
  ImplementedProductRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapters: ImplementedProductRelationalPrismaAdapters;
    disconnect(): Promise<void>;
  };

export const createImplementedProductRelationalPrismaAdapters = (
  client: FirstDurableRelationalRuntimePrismaClient
): ImplementedProductRelationalPrismaAdapters => ({
  firstDurableAdapter: new PrismaFirstDurableRelationalRepositoryAdapter(client),
  signalEvaluationAdapter: createSignalEvaluationRelationalPrismaRepositoryAdapter(client),
  setupAggregateAdapter: createSetupAggregateRelationalPrismaRepositoryAdapter(client),
  feedbackDecisionAdapter: createResearchFeedbackDecisionRelationalPrismaRepositoryAdapter(client)
});

export const createImplementedProductRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): ImplementedProductRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapters = createImplementedProductRelationalPrismaAdapters(prismaClient);

  return {
    prismaClient,
    adapters,
    ...composeImplementedProductRelationalRepositories(adapters),
    disconnect: async () => prismaClient.$disconnect()
  };
};
