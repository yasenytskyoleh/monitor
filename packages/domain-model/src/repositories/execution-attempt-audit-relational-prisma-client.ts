import type {
  FirstDurableRelationalPrismaClientOptions,
  FirstDurableRelationalRuntimePrismaClient
} from "./first-durable-relational-prisma-client.js";
import { createFirstDurableRelationalPrismaClient } from "./first-durable-relational-prisma-client.js";
import {
  PrismaExecutionAttemptAuditRelationalRepositoryAdapter
} from "./execution-attempt-audit-relational-prisma-adapter.js";
import {
  composeExecutionAttemptAuditRelationalRepositories,
  type ExecutionAttemptAuditRelationalRepositories
} from "./execution-attempt-audit-relational-repositories.js";

export type ExecutionAttemptAuditRelationalPrismaRepositories =
  ExecutionAttemptAuditRelationalRepositories & {
    prismaClient: FirstDurableRelationalRuntimePrismaClient;
    adapter: PrismaExecutionAttemptAuditRelationalRepositoryAdapter;
    disconnect(): Promise<void>;
  };

export const createExecutionAttemptAuditRelationalPrismaRepositoryAdapter = (
  client: FirstDurableRelationalRuntimePrismaClient
): PrismaExecutionAttemptAuditRelationalRepositoryAdapter =>
  new PrismaExecutionAttemptAuditRelationalRepositoryAdapter(client);

export const createExecutionAttemptAuditRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): ExecutionAttemptAuditRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = createExecutionAttemptAuditRelationalPrismaRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeExecutionAttemptAuditRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
