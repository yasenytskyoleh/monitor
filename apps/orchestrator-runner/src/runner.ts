import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";

import { ConfigReleaseManager } from "@monitor/agent-config";

import { parseArgs } from "./cli.js";
import { loadDotEnv } from "./env.js";
import { assertSuccessfulResult, formatRunnerOutput } from "./output.js";
import { runMockMode } from "./scenario-runner.js";
import type { CliArgs, RunnerOutput } from "./types.js";

export async function runWithArgv(argv: string[], startDir = process.cwd()): Promise<RunnerOutput> {
  const args = parseArgs(argv);
  const rootDir = args.rootDir ? resolve(args.rootDir) : await findRepoRoot(startDir);
  await loadDotEnv(rootDir);

  const manager = new ConfigReleaseManager(rootDir);
  const snapshotResult = await manager.compileSnapshot({
    environment: args.environment,
    version: args.version,
    overwrite: true
  });

  const snapshotPath = join(rootDir, snapshotResult.snapshotPath);
  const taskInput = await resolveTaskInput(rootDir, args);

  if (args.mode === "mock") {
    const result = await runMockMode({
      args,
      rootDir,
      snapshotPath,
      snapshotResult: snapshotResult as unknown as Record<string, unknown>,
      taskInput
    });
    assertSuccessfulResult(result);
    return result;
  }

  const result = await runLiveMode();
  assertSuccessfulResult(result);
  return result;
}

export async function runCli(argv = process.argv.slice(2), startDir = process.cwd()): Promise<void> {
  const result = await runWithArgv(argv, startDir);
  process.stdout.write(`${formatRunnerOutput(result)}\n`);
}

async function runLiveMode(): Promise<RunnerOutput> {
  throw new Error("Mode 'live' is not implemented in this milestone. Use --mode mock.");
}

async function resolveTaskInput(rootDir: string, args: CliArgs): Promise<Record<string, unknown>> {
  if (args.inputJson) {
    return parseJsonObject(args.inputJson, "--input-json");
  }

  if (args.inputFile) {
    const inputPath = isAbsolute(args.inputFile) ? args.inputFile : join(rootDir, args.inputFile);
    const content = await readFile(inputPath, "utf8");
    return parseJsonObject(content, "--input-file");
  }

  return {
    title: args.taskTitle
  };
}

function parseJsonObject(raw: string, source: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${source}: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${source} must decode to a JSON object`);
  }

  return parsed as Record<string, unknown>;
}

async function findRepoRoot(startDir: string): Promise<string> {
  let current = resolve(startDir);

  while (true) {
    const marker = join(current, "configs", "agents", "base", "runtime-defaults.yaml");
    if (await exists(marker)) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error(
        "Unable to resolve repository root. Use --root to point to the monitor workspace."
      );
    }
    current = parent;
  }
}

async function exists(pathValue: string): Promise<boolean> {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
}
