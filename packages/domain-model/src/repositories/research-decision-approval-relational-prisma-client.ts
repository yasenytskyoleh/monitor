import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaResearchDecisionApprovalRelationalRepositoryAdapter
} from "./research-decision-approval-relational-prisma-adapter.js";
import {
  composeResearchDecisionApprovalRelationalRepositories,
  type ResearchDecisionApprovalRelationalRepositories
} from "./research-decision-approval-relational-repositories.js";

export type ResearchDecisionApprovalRelationalPrismaRepositories =
  ResearchDecisionApprovalRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaResearchDecisionApprovalRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createResearchDecisionApprovalRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaResearchDecisionApprovalRelationalRepositoryAdapter =>
  new PrismaResearchDecisionApprovalRelationalRepositoryAdapter(client);

export const createResearchDecisionApprovalRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): ResearchDecisionApprovalRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = createResearchDecisionApprovalRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeResearchDecisionApprovalRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
