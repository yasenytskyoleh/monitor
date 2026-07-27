import assert from "node:assert/strict";
import test from "node:test";

import {
  createFirstDurableRelationalPrismaClient,
  createMonitoredSymbolRelationalPrismaRepositories
} from "../src/index.js";

test("prisma client wiring exposes generated delegates for the first durable slice", async () => {
  const prisma = createFirstDurableRelationalPrismaClient({
    connectionString: "postgresql://postgres:postgres@localhost:5432/monitor"
  });

  try {
    assert.equal(typeof prisma.setupDefinitionRecord.findUnique, "function");
    assert.equal(typeof prisma.researchHypothesisRecord.findMany, "function");
    assert.equal(typeof prisma.researchHypothesisSetupDefinitionLinkRecord.createMany, "function");
    assert.equal(typeof prisma.researchDecisionApprovalRecord.findUnique, "function");
  } finally {
    await prisma.$disconnect();
  }
});

test("prisma repository composition wires the monitored-symbol catalog", async () => {
  const repositories = createMonitoredSymbolRelationalPrismaRepositories({
    connectionString: "postgresql://postgres:postgres@localhost:5432/monitor"
  });

  try {
    assert.equal(typeof repositories.adapter.loadMonitoredSymbolRecord, "function");
    assert.equal(typeof repositories.monitoredSymbolRepository.create, "function");
  } finally {
    await repositories.disconnect();
  }
});
