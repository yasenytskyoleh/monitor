import * as assert from "node:assert/strict";
import { test } from "node:test";

import { ArtifactRegistry } from "../src/artifacts/registry.js";

test("artifact registry stores normalized artifact records", () => {
  const registry = new ArtifactRegistry({
    runId: "run_001",
    taskId: "task_001",
    scenario: "happy"
  });

  const created = registry.register({
    producer: "product-agent",
    state: "INTAKE",
    createdAtUtc: "2026-04-09T10:00:00.000Z",
    artifactTypes: ["product-brief"]
  });

  assert.equal(created.length, 1);
  assert.equal(created[0]?.artifactType, "product-brief");
  assert.equal(created[0]?.producedBy, "product-agent");
  assert.equal(created[0]?.taskId, "task_001");
  assert.equal(created[0]?.runId, "run_001");
  assert.equal(created[0]?.state, "INTAKE");
  assert.equal(created[0]?.version, 1);
  assert.ok(created[0]?.artifactRef.includes("product-brief"));
});

test("artifact registry rejects unknown transition references", () => {
  const registry = new ArtifactRegistry({
    runId: "run_001",
    taskId: "task_001",
    scenario: "happy"
  });

  registry.register({
    producer: "product-agent",
    state: "INTAKE",
    createdAtUtc: "2026-04-09T10:00:00.000Z",
    artifactTypes: ["product-brief"]
  });

  assert.throws(
    () => registry.assertReferencesKnown(["product-brief", "unknown-ref"]),
    /Unknown artifact reference/
  );
});

test("artifact registry rejects forbidden artifact type for role", () => {
  const registry = new ArtifactRegistry({
    runId: "run_001",
    taskId: "task_001",
    scenario: "happy"
  });

  assert.throws(
    () =>
      registry.register({
        producer: "product-agent",
        state: "INTAKE",
        createdAtUtc: "2026-04-09T10:00:00.000Z",
        artifactTypes: ["architecture-design"]
      }),
    /not allowed for 'product-agent'/
  );
});

test("artifact registry enforces required artifacts by state", () => {
  const registry = new ArtifactRegistry({
    runId: "run_001",
    taskId: "task_001",
    scenario: "happy"
  });

  registry.register({
    producer: "product-agent",
    state: "INTAKE",
    createdAtUtc: "2026-04-09T10:00:00.000Z",
    artifactTypes: ["product-brief"]
  });

  assert.throws(
    () => registry.assertRequiredArtifactTypes("FORMALIZE", ["adr-draft", "architecture-design"]),
    /Missing required artifacts for state 'FORMALIZE'/
  );
});

test("artifact registry detects duplicate artifact reference collisions", () => {
  const registry = new ArtifactRegistry({
    runId: "run_001",
    taskId: "task_001",
    scenario: "happy",
    artifactRefGenerator: () => "artifact-fixed"
  });

  registry.register({
    producer: "product-agent",
    state: "INTAKE",
    createdAtUtc: "2026-04-09T10:00:00.000Z",
    artifactTypes: ["product-brief"]
  });

  assert.throws(
    () =>
      registry.register({
        producer: "product-agent",
        state: "INTAKE",
        createdAtUtc: "2026-04-09T10:00:01.000Z",
        artifactTypes: ["product-brief"]
      }),
    /Duplicate artifact reference collision/
  );
});

