import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { PersistRunArtifactInput, PersistRunArtifactResult } from "./types.js";

export class FileRunStore {
  public constructor(private readonly rootDir: string) {}

  public createRunId(now = new Date()): string {
    const year = now.getUTCFullYear();
    const month = pad2(now.getUTCMonth() + 1);
    const day = pad2(now.getUTCDate());
    const hour = pad2(now.getUTCHours());
    const minute = pad2(now.getUTCMinutes());
    const second = pad2(now.getUTCSeconds());
    const ms = String(now.getUTCMilliseconds()).padStart(3, "0");
    const random = Math.floor(Math.random() * 10_000)
      .toString()
      .padStart(4, "0");

    return `run_${year}${month}${day}_${hour}${minute}${second}_${ms}${random}`;
  }

  public async persist(input: PersistRunArtifactInput): Promise<PersistRunArtifactResult> {
    const runDir = join(this.rootDir, "runtime", "runs", input.runId);
    await mkdir(runDir, { recursive: true });

    await writeJson(join(runDir, "run.json"), input.runRecord);
    await writeJson(join(runDir, "transitions.json"), input.transitions);
    await writeJson(join(runDir, "terminal-outcome.json"), input.terminalOutcome);

    if (input.inputTask) {
      await writeJson(join(runDir, "input-task.json"), input.inputTask);
    }

    if (input.compiledSnapshotMeta) {
      await writeJson(join(runDir, "compiled-snapshot-meta.json"), input.compiledSnapshotMeta);
    }

    return {
      runId: input.runId,
      runDir,
      relativeRunDir: toRelativeOrAbsolute(this.rootDir, runDir)
    };
  }
}

async function writeJson(pathValue: string, value: unknown): Promise<void> {
  await writeFile(pathValue, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toRelativeOrAbsolute(rootDir: string, pathValue: string): string {
  const normalizedRoot = resolve(rootDir);
  const normalizedPath = resolve(pathValue);
  if (normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return normalizedPath.slice(normalizedRoot.length + 1);
  }
  return normalizedPath;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
