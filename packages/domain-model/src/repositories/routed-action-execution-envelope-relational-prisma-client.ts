import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter
} from "./routed-action-execution-envelope-relational-prisma-adapter.js";
import {
  composeRoutedActionExecutionEnvelopeRelationalRepositories,
  type RoutedActionExecutionEnvelopeRelationalRepositories
} from "./routed-action-execution-envelope-relational-repositories.js";

export type RoutedActionExecutionEnvelopeRelationalPrismaRepositories =
  RoutedActionExecutionEnvelopeRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createRoutedActionExecutionEnvelopeRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter =>
  new PrismaRoutedActionExecutionEnvelopeRelationalRepositoryAdapter(client);

export const createRoutedActionExecutionEnvelopeRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): RoutedActionExecutionEnvelopeRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter =
    createRoutedActionExecutionEnvelopeRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeRoutedActionExecutionEnvelopeRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
