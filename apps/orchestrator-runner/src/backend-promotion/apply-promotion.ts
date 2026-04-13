import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { BackendPatchError } from "../backend-patch/errors.js";

export type ApplyPromotionInput = {
  rootDir: string;
  isolatedWorkspaceRoot: string;
  filesToPromote: string[];
};

export type ApplyPromotionResult = {
  filesPromoted: string[];
};

type PromotionWriteEntry = {
  filePath: string;
  sourcePath: string;
  targetPath: string;
  sourceContent: string;
  targetBefore: {
    existed: boolean;
    content: string | null;
  };
};

export async function applyPromotion(input: ApplyPromotionInput): Promise<ApplyPromotionResult> {
  const rootDir = resolve(input.rootDir);
  const isolatedWorkspaceRoot = resolve(input.isolatedWorkspaceRoot);
  const filesToPromote = uniqueStrings(input.filesToPromote);
  const writes = await buildPromotionWriteEntries({
    rootDir,
    isolatedWorkspaceRoot,
    filesToPromote
  });

  const filesPromoted: string[] = [];
  try {
    for (const entry of writes) {
      await mkdir(dirname(entry.targetPath), { recursive: true });
      await writeFile(entry.targetPath, entry.sourceContent, "utf8");
      filesPromoted.push(entry.filePath);
    }
  } catch (error) {
    const rollbackError = await rollbackPromotionWrites({
      writes,
      promotedFiles: filesPromoted
    });
    const rollbackDetails =
      rollbackError === null
        ? ""
        : ` Rollback after partial promotion failed: ${
            rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
          }`;

    throw new BackendPatchError(
      "promotion_failure",
      `Promotion write failed after promoting ${filesPromoted.length}/${writes.length} files: ${
        error instanceof Error ? error.message : String(error)
      }.${rollbackDetails}`,
      { cause: error }
    );
  }

  return {
    filesPromoted
  };
}

async function buildPromotionWriteEntries(input: {
  rootDir: string;
  isolatedWorkspaceRoot: string;
  filesToPromote: string[];
}): Promise<PromotionWriteEntry[]> {
  const writes: PromotionWriteEntry[] = [];

  for (const filePath of input.filesToPromote) {
    const normalizedPath = normalizeRelativePath(filePath);
    const sourcePath = resolve(input.isolatedWorkspaceRoot, normalizedPath);
    const targetPath = resolve(input.rootDir, normalizedPath);
    assertInsideRoot(sourcePath, input.isolatedWorkspaceRoot, filePath, "isolated workspace");
    assertInsideRoot(targetPath, input.rootDir, filePath, "repository root");

    const sourceContent = await readFile(sourcePath, "utf8");
    let targetBefore: PromotionWriteEntry["targetBefore"];
    try {
      targetBefore = {
        existed: true,
        content: await readFile(targetPath, "utf8")
      };
    } catch {
      targetBefore = {
        existed: false,
        content: null
      };
    }

    writes.push({
      filePath,
      sourcePath,
      targetPath,
      sourceContent,
      targetBefore
    });
  }

  return writes;
}

async function rollbackPromotionWrites(input: {
  writes: PromotionWriteEntry[];
  promotedFiles: string[];
}): Promise<unknown> {
  const writesByFile = new Map(input.writes.map((entry) => [entry.filePath, entry]));
  let failure: unknown = null;

  for (let index = input.promotedFiles.length - 1; index >= 0; index -= 1) {
    const filePath = input.promotedFiles[index];
    if (!filePath) {
      continue;
    }

    const entry = writesByFile.get(filePath);
    if (!entry) {
      continue;
    }

    try {
      if (entry.targetBefore.existed) {
        await writeFile(entry.targetPath, entry.targetBefore.content ?? "", "utf8");
      } else {
        await rm(entry.targetPath, { force: true });
      }
    } catch (error) {
      failure = error;
      break;
    }
  }

  return failure;
}

function normalizeRelativePath(value: string): string {
  return value.replace(/\\/gu, "/").replace(/^\.\/+/u, "");
}

function assertInsideRoot(
  absolutePath: string,
  root: string,
  label: string,
  rootName: "repository root" | "isolated workspace"
): void {
  const normalizedRoot = root.endsWith("/") ? root : `${root}/`;
  if (!absolutePath.startsWith(normalizedRoot)) {
    throw new BackendPatchError(
      "forbidden_path",
      `Promotion path '${label}' escapes ${rootName}`
    );
  }
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter((item) => item.length > 0)));
}
