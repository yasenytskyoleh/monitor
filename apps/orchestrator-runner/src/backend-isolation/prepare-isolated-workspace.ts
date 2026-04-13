import { access, cp, lstat, mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

import { BackendPatchError } from "../backend-patch/errors.js";
import type { PrepareIsolatedWorkspaceInput, PreparedIsolatedWorkspace } from "./types.js";

const BASE_COPY_ENTRIES = [
  "package.json",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "tsconfig.json",
  "tsconfig.base.json",
  ".npmrc"
] as const;

const VERIFICATION_COPY_ENTRIES = [
  "apps/orchestrator-runner",
  "packages/orchestrator-core",
  "packages/agent-config",
  "configs"
] as const;

export async function prepareIsolatedWorkspace(
  input: PrepareIsolatedWorkspaceInput
): Promise<PreparedIsolatedWorkspace> {
  const rootDir = resolve(input.rootDir);
  const workspaceRoot = await mkdtemp(join(tmpdir(), "monitor-backend-iso-"));
  const workspaceId = basename(workspaceRoot);
  const copiedEntries: string[] = [];
  const candidates = new Set<string>();

  for (const entry of BASE_COPY_ENTRIES) {
    candidates.add(entry);
  }

  for (const diff of input.patchPlan.proposedDiffs) {
    candidates.add(normalizeRelativePath(diff.filePath));
  }

  if (input.verificationMode !== "none") {
    for (const entry of VERIFICATION_COPY_ENTRIES) {
      candidates.add(entry);
    }
  }

  const sortedCandidates = Array.from(candidates).sort((a, b) => a.localeCompare(b));
  for (const candidate of sortedCandidates) {
    if (await copyEntryIfExists(rootDir, workspaceRoot, candidate)) {
      copiedEntries.push(candidate);
    }
  }

  return {
    workspaceId,
    workspaceRoot,
    copiedEntries,
    copiedFilesCount: copiedEntries.length,
    executionPatchPlan: remapPatchPlanToWorkspace(input.patchPlan, workspaceRoot)
  };
}

async function copyEntryIfExists(
  rootDir: string,
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> {
  const normalized = normalizeRelativePath(relativePath);
  const sourcePath = resolve(rootDir, normalized);
  const destinationPath = resolve(workspaceRoot, normalized);
  assertInsideRoot(sourcePath, rootDir, normalized);
  assertInsideRoot(destinationPath, workspaceRoot, normalized);

  try {
    const stat = await lstat(sourcePath);
    await mkdir(dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath, {
      recursive: stat.isDirectory(),
      force: true,
      errorOnExist: false
    });
    return true;
  } catch (error) {
    if (!(await pathExists(sourcePath))) {
      return false;
    }

    throw new BackendPatchError(
      "apply_failure",
      `Failed to prepare isolated workspace entry '${normalized}': ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    );
  }
}

function remapPatchPlanToWorkspace(
  patchPlan: PrepareIsolatedWorkspaceInput["patchPlan"],
  workspaceRoot: string
): PrepareIsolatedWorkspaceInput["patchPlan"] {
  const workspaceRootAbs = resolve(workspaceRoot);
  const proposedDiffs = patchPlan.proposedDiffs.map((diff) => {
    const absolutePath = resolve(workspaceRootAbs, normalizeRelativePath(diff.filePath));
    assertInsideRoot(absolutePath, workspaceRootAbs, diff.filePath);
    return {
      ...diff,
      absolutePath
    };
  });

  return {
    ...patchPlan,
    proposedDiffs
  };
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\/+/u, "");
}

async function pathExists(pathValue: string): Promise<boolean> {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
}

function assertInsideRoot(absolutePath: string, root: string, label: string): void {
  const normalizedRoot = root.endsWith("/") ? root : `${root}/`;
  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new BackendPatchError(
      "forbidden_path",
      `Isolated workspace path '${label}' escapes allowed root`
    );
  }
}
