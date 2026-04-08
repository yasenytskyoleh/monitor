import { cp, mkdtemp, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import { ConfigReleaseManager } from "@monitor/agent-config";

export async function createTempWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "orchestrator-core-workspace-"));
  const repoRoot = resolveRepoRoot();

  await cp(join(repoRoot, "configs"), join(workspaceRoot, "configs"), {
    recursive: true
  });

  return workspaceRoot;
}

export async function cleanupTempWorkspace(workspaceRoot: string): Promise<void> {
  await rm(workspaceRoot, {
    recursive: true,
    force: true
  });
}

export async function compileLocalSnapshot(workspaceRoot: string, version: string): Promise<string> {
  const manager = new ConfigReleaseManager(workspaceRoot);
  const result = await manager.compileSnapshot({
    environment: "local",
    version,
    overwrite: true
  });
  return join(workspaceRoot, result.snapshotPath);
}

function resolveRepoRoot(): string {
  const currentTestDirectory = dirname(fileURLToPath(import.meta.url));
  return join(currentTestDirectory, "..", "..", "..");
}
