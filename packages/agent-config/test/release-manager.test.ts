import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ConfigValidationError, ReleaseOperationError } from "../src/errors.js";
import { ConfigReleaseManager } from "../src/release-manager.js";
import type { RuntimeConfigSnapshot } from "../src/types.js";
import { cleanupTempWorkspace, createTempWorkspace, updateYamlFile } from "./helpers.js";

test("supports publish, activate, and rollback lifecycle", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  const manager = new ConfigReleaseManager(workspaceRoot);
  const baseVersion = `vtest-${Date.now()}`;
  const firstVersion = `${baseVersion}-1`;
  const secondVersion = `${baseVersion}-2`;

  const firstRecord = await manager.publish({
    version: firstVersion,
    createdBy: "tester",
    environments: ["dev"]
  });

  assert.equal(firstRecord.configVersion, firstVersion);
  assert.equal(firstRecord.environment, "dev");
  assert.equal(firstRecord.createdBy, "tester");
  assert.ok(firstRecord.snapshotPath);
  assert.ok(firstRecord.createdAt);

  let manifest = await manager.activate({
    environment: "dev",
    version: firstVersion,
    activatedBy: "tester"
  });

  assert.equal(manifest.active.configVersion, firstVersion);

  await updateYamlFile<{ overrides: { runtime: { defaultModel: string } } }>(
    join(workspaceRoot, "configs/agents/env/dev.yaml"),
    (config) => {
      config.overrides.runtime.defaultModel = "gpt-5.4-mini";
      return config;
    }
  );

  const secondRecord = await manager.publish({
    version: secondVersion,
    createdBy: "tester",
    environments: ["dev"]
  });

  assert.equal(secondRecord.configVersion, secondVersion);

  manifest = await manager.activate({
    environment: "dev",
    version: secondVersion,
    activatedBy: "tester"
  });

  assert.equal(manifest.active.configVersion, secondVersion);

  manifest = await manager.rollback({
    environment: "dev",
    activatedBy: "tester"
  });

  assert.equal(manifest.active.configVersion, firstVersion);
});

test("enforces immutable publish by version", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  const manager = new ConfigReleaseManager(workspaceRoot);
  const version = `vtest-${Date.now()}-immutable`;

  await manager.publish({
    version,
    createdBy: "tester",
    environments: ["dev"]
  });

  await assert.rejects(
    manager.publish({
      version,
      createdBy: "tester",
      environments: ["dev"]
    }),
    ReleaseOperationError
  );
});

test("compiles and writes snapshot artifact for runtime", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  const manager = new ConfigReleaseManager(workspaceRoot);
  const result = await manager.compileSnapshot({
    environment: "local",
    version: "v1",
    overwrite: true
  });

  assert.equal(result.environment, "local");
  assert.equal(result.version, "v1");
  assert.match(result.checksum, /^[a-f0-9]{64}$/);
  assert.equal(result.snapshotPath, "configs/agents/versions/snapshots/local.v1.json");

  const rawSnapshot = await readFile(join(workspaceRoot, result.snapshotPath), "utf8");
  const parsedSnapshot = JSON.parse(rawSnapshot) as RuntimeConfigSnapshot;

  assert.equal(parsedSnapshot.environment, "local");
  assert.equal(parsedSnapshot.version, "v1");
  assert.equal(parsedSnapshot.checksum, result.checksum);
});

test("uses active manifest version when snapshot version is not provided", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{ active: { configVersion: string } }>(
    join(workspaceRoot, "configs/agents/versions/manifest.yaml"),
    (manifest) => {
      manifest.active.configVersion = "v-next";
      return manifest;
    }
  );

  const manager = new ConfigReleaseManager(workspaceRoot);

  await assert.rejects(
    manager.compileSnapshot({
      environment: "dev"
    }),
    ConfigValidationError
  );
});
