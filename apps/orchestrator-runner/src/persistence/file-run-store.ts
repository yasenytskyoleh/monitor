import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { PersistRunArtifactInput, PersistRunArtifactResult } from "./types.js";

export type RunClock = {
  now(): Date;
};

export type RunIdGenerator = (now: Date) => string;

export type FileRunStoreOptions = {
  clock?: RunClock;
  runIdGenerator?: RunIdGenerator;
};

export class FileRunStore {
  private readonly clock: RunClock;
  private readonly runIdGenerator: RunIdGenerator;

  public constructor(
    private readonly rootDir: string,
    options: FileRunStoreOptions = {}
  ) {
    this.clock = options.clock ?? {
      now: () => new Date()
    };
    this.runIdGenerator = options.runIdGenerator ?? defaultRunIdGenerator;
  }

  public nowIsoUtc(): string {
    return this.clock.now().toISOString();
  }

  public createRunId(now = this.clock.now()): string {
    return this.runIdGenerator(now);
  }

  public async persist(input: PersistRunArtifactInput): Promise<PersistRunArtifactResult> {
    const runDir = join(this.rootDir, "runtime", "runs", input.runId);
    await mkdir(runDir, { recursive: true });

    await writeJson(join(runDir, "run.json"), input.runRecord);
    await writeJson(join(runDir, "transitions.json"), input.transitions);
    await writeJson(join(runDir, "terminal-outcome.json"), input.terminalOutcome);
    await writeJson(join(runDir, "approvals.json"), input.approvals);
    await writeJson(join(runDir, "artifacts.json"), input.artifacts);
    if (input.patchPlans && input.patchPlans.length > 0) {
      await writeJson(join(runDir, "patch-plan.json"), input.patchPlans);
    }
    if (input.patchResults) {
      await writeJson(join(runDir, "patch-result.json"), input.patchResults);
    }
    if (input.verificationResults) {
      await writeJson(join(runDir, "verification-result.json"), input.verificationResults);
    }

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

function defaultRunIdGenerator(now: Date): string {
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
