import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";
import { FIRST_DURABLE_RELATIONAL_DATABASE_SCHEMA } from "../storage/first-durable-relational-physical-schema.js";
import {
  composeFirstDurableRelationalRepositories,
  type FirstDurableRelationalRepositories
} from "./first-durable-relational-repositories.js";
import { PrismaFirstDurableRelationalRepositoryAdapter } from "./first-durable-relational-prisma-adapter.js";

export type FirstDurableRelationalPrismaClientOptions = {
  connectionString: string;
  databaseSchema?: string;
};

export type FirstDurableRelationalRuntimePrismaClient = PrismaClient;
export type FirstDurableRelationalPrismaRepositories = FirstDurableRelationalRepositories & {
  prismaClient: FirstDurableRelationalRuntimePrismaClient;
  adapter: PrismaFirstDurableRelationalRepositoryAdapter;
  disconnect(): Promise<void>;
};

export const createFirstDurableRelationalPrismaClient = (
  options: FirstDurableRelationalPrismaClientOptions
): FirstDurableRelationalRuntimePrismaClient => {
  const adapter = new PrismaPg(
    { connectionString: options.connectionString },
    { schema: options.databaseSchema ?? FIRST_DURABLE_RELATIONAL_DATABASE_SCHEMA }
  );

  return new PrismaClient({ adapter });
};

export const createFirstDurableRelationalPrismaRepositoryAdapter = (
  options: FirstDurableRelationalPrismaClientOptions
): PrismaFirstDurableRelationalRepositoryAdapter =>
  new PrismaFirstDurableRelationalRepositoryAdapter(createFirstDurableRelationalPrismaClient(options));

export const createFirstDurableRelationalPrismaRepositories = (
  options: FirstDurableRelationalPrismaClientOptions
): FirstDurableRelationalPrismaRepositories => {
  const prismaClient = createFirstDurableRelationalPrismaClient(options);
  const adapter = new PrismaFirstDurableRelationalRepositoryAdapter(prismaClient);

  return {
    prismaClient,
    adapter,
    ...composeFirstDurableRelationalRepositories(adapter),
    disconnect: async () => prismaClient.$disconnect()
  };
};
