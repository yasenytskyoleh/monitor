import { access, mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";

import { ConfigReleaseManager } from "@monitor/agent-config";
import { OrchestratorCore } from "@monitor/orchestrator-core";
import type { AgentHandlers } from "@monitor/orchestrator-core";

import { createLiveProductAgentHandler } from "./adapters/live/product-agent.js";
import { parseArgs } from "./cli.js";
import { loadDotEnv, requireOpenAiApiKey } from "./env.js";
import { createMockHandlers } from "./mock-handlers.js";
import { assertSuccessfulResult, formatRunnerOutput } from "./output.js";
import { resolveLogPath, toRelativeOrAbsolute } from "./runtime-paths.js";
import { createInitialTask, runHappyWorkflow, runMockMode } from "./scenario-runner.js";
import type { CliArgs, RunnerOutput } from "./types.js";

export type RunnerDependencies = {
  liveProductFetchImpl?: typeof fetch;
};

export async function runWithArgv(
  argv: string[],
  startDir = process.cwd(),
  dependencies: RunnerDependencies = {}
): Promise<RunnerOutput> {
  const args = parseArgs(argv);
  const rootDir = args.rootDir ? resolve(args.rootDir) : await findRepoRoot(startDir);
  const envLoadResult = await loadDotEnv(rootDir);

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

  const result = await runLiveMode({
    args,
    rootDir,
    snapshotPath,
    snapshotResult: snapshotResult as unknown as Record<string, unknown>,
    taskInput,
    openAiApiKey: requireOpenAiApiKey(envLoadResult.loadedFrom),
    fetchImpl: dependencies.liveProductFetchImpl
  });
  assertSuccessfulResult(result);
  return result;
}

export async function runCli(argv = process.argv.slice(2), startDir = process.cwd()): Promise<void> {
  const result = await runWithArgv(argv, startDir);
  process.stdout.write(`${formatRunnerOutput(result)}\n`);
}

type LiveRunModeOptions = {
  args: CliArgs;
  rootDir: string;
  snapshotPath: string;
  snapshotResult: Record<string, unknown>;
  taskInput: Record<string, unknown>;
  openAiApiKey: string;
  fetchImpl?: typeof fetch;
};

async function runLiveMode(options: LiveRunModeOptions): Promise<RunnerOutput> {
  const snapshotVersion = String(options.snapshotResult.version ?? options.args.version ?? "v1");
  const transitionLogPath = resolveLogPath(options.rootDir, options.args, snapshotVersion);
  await mkdir(dirname(transitionLogPath), { recursive: true });

  const handlers: AgentHandlers = {
    ...createMockHandlers(),
    "product-agent": createLiveProductAgentHandler({
      apiKey: options.openAiApiKey,
      promptsRootDir: join(options.rootDir, "configs/agents/prompts"),
      model: options.args.model,
      temperature: options.args.temperature,
      timeoutMs: options.args.timeoutMs,
      fetchImpl: options.fetchImpl
    })
  };

  const orchestrator = await OrchestratorCore.fromSnapshotFile({
    snapshotPath: options.snapshotPath,
    transitionLogPath,
    handlers,
    executedBy: "orchestrator-runner-live-hybrid"
  });

  const task = createInitialTask(
    options.args,
    snapshotVersion,
    options.taskInput
  );

  const workflowResult = await runHappyWorkflow(orchestrator, task, options.args, {
    designReason: "Live Product handoff",
    formalizeReason: "Mock Architect handoff",
    implementReason: "Mock Quant handoff",
    reviewReason: "Mock Backend handoff",
    approvalReason: "Mock Docs review complete",
    publishReason: "Mock publish approval granted",
    doneReason: "Hybrid live-mock completion",
    architectureApprovalSuffix: "live"
  });

  return {
    status: "ok",
    snapshot: options.snapshotResult,
    transitionLogPath: toRelativeOrAbsolute(options.rootDir, transitionLogPath),
    taskState: workflowResult.task.workflowState,
    output: workflowResult.output,
    transitions: workflowResult.transitions
  };
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
