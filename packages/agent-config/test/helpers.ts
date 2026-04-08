import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import YAML from "yaml";

export async function createTempWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "agent-config-workspace-"));
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

export async function updateYamlFile<T>(filePath: string, updater: (current: T) => T): Promise<void> {
  const raw = await readFile(filePath, "utf8");
  const current = YAML.parse(raw) as T;
  const updated = updater(current);
  await writeFile(filePath, YAML.stringify(updated), "utf8");
}

export function resolveRepoRoot(): string {
  const currentTestDirectory = dirname(fileURLToPath(import.meta.url));
  return join(currentTestDirectory, "..", "..", "..");
}
