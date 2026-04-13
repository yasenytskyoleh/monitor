import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import type { BackendPatchPlan } from "../backend-patch/types.js";
import { BackendPatchError } from "../backend-patch/errors.js";
import type { PreparedPromotion } from "./types.js";

export type PreparePromotionInput = {
  rootDir: string;
  patchPlan: BackendPatchPlan;
};

export async function preparePromotion(input: PreparePromotionInput): Promise<PreparedPromotion> {
  const rootDir = resolve(input.rootDir);
  const filesPlannedForPromotion = uniqueStrings(input.patchPlan.proposedDiffs.map((diff) => diff.filePath));
  const originalFingerprints: Record<string, string | null> = {};

  for (const filePath of filesPlannedForPromotion) {
    originalFingerprints[filePath] = await computeWorkspaceFileFingerprint({
      rootDir,
      filePath
    });
  }

  return {
    filesPlannedForPromotion,
    originalFingerprints
  };
}

export async function computeWorkspaceFileFingerprint(input: {
  rootDir: string;
  filePath: string;
}): Promise<string | null> {
  const rootDir = resolve(input.rootDir);
  const absolutePath = resolve(rootDir, normalizeRelativePath(input.filePath));
  assertInsideRoot(absolutePath, rootDir, input.filePath);

  if (!(await pathExists(absolutePath))) {
    return null;
  }

  const content = await readFile(absolutePath, "utf8");
  return createHash("sha256").update(content).digest("hex");
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\/+/u, "");
}

function assertInsideRoot(absolutePath: string, root: string, label: string): void {
  const normalizedRoot = root.endsWith("/") ? root : `${root}/`;
  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new BackendPatchError(
      "forbidden_path",
      `Promotion path '${label}' escapes repository root`
    );
  }
}

async function pathExists(pathValue: string): Promise<boolean> {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter((item) => item.length > 0)));
}
