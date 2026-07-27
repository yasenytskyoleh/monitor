import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaMonitoredSymbolRelationalRepositoryAdapter
} from "./monitored-symbol-relational-prisma-adapter.js";
import {
  composeMonitoredSymbolRelationalRepositories,
  type MonitoredSymbolRelationalRepositories
} from "./monitored-symbol-relational-repositories.js";

export type MonitoredSymbolRelationalPrismaRepositories =
  MonitoredSymbolRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaMonitoredSymbolRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createMonitoredSymbolRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaMonitoredSymbolRelationalRepositoryAdapter =>
  new PrismaMonitoredSymbolRelationalRepositoryAdapter(client);

export const createMonitoredSymbolRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): MonitoredSymbolRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = createMonitoredSymbolRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeMonitoredSymbolRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
