#!/usr/bin/env node
import { access, mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";

import { ConfigReleaseManager, SUPPORTED_ENVIRONMENTS } from "@monitor/agent-config";
import type { ApprovalReference } from "@monitor/agent-config";
import type { EnvironmentName } from "@monitor/agent-config";
import {
  OrchestratorCore,
  createOpenAiArchitectAgentHandler,
  createOpenAiProductAgentHandler
} from "@monitor/orchestrator-core";
import type { TaskEnvelope } from "@monitor/orchestrator-core";
import { loadDotEnv, requireOpenAiApiKey } from "./env.js";

type TargetState = "DESIGN" | "FORMALIZE";

type CliArgs = {
  rootDir?: string;
  environment: EnvironmentName;
  version?: string;
  targetState: TargetState;
  taskId: string;
  requestedBy: string;
  taskTitle: string;
  inputFile?: string;
  inputJson?: string;
  logPath?: string;
  approvalId?: string;
  approvalBy?: string;
  approvalAtUtc?: string;
  approvalExpiresAtUtc?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
};

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = args.rootDir ? resolve(args.rootDir) : await findRepoRoot(process.cwd());
  const envLoadResult = await loadDotEnv(rootDir);
  const openAiApiKey = requireOpenAiApiKey(envLoadResult.loadedFrom);

  const manager = new ConfigReleaseManager(rootDir);
  const snapshotResult = await manager.compileSnapshot({
    environment: args.environment,
    version: args.version,
    overwrite: true
  });

  const snapshotPath = join(rootDir, snapshotResult.snapshotPath);
  const transitionLogPath = resolveLogPath(rootDir, args, snapshotResult.version);
  await mkdir(dirname(transitionLogPath), { recursive: true });

  const taskInput = await resolveTaskInput(rootDir, args);
  const task: TaskEnvelope = {
    taskId: args.taskId,
    requestedBy: args.requestedBy,
    workflowState: "INTAKE",
    input: taskInput,
    configVersion: snapshotResult.version,
    artifactRefs: []
  };

  const orchestrator = await OrchestratorCore.fromSnapshotFile({
    snapshotPath,
    transitionLogPath,
    handlers: {
      "product-agent": createOpenAiProductAgentHandler({
        apiKey: openAiApiKey,
        promptsRootDir: join(rootDir, "configs/agents/prompts"),
        model: args.model,
        temperature: args.temperature,
        timeoutMs: args.timeoutMs
      }),
      "architect-agent": createOpenAiArchitectAgentHandler({
        apiKey: openAiApiKey,
        promptsRootDir: join(rootDir, "configs/agents/prompts"),
        model: args.model,
        temperature: args.temperature,
        timeoutMs: args.timeoutMs
      })
    },
    executedBy: "orchestrator-runner"
  });

  const transitionResults = [];
  const designResult = await orchestrator.transition({
    task,
    to: "DESIGN",
    reason: "Live Product Agent handoff"
  });
  transitionResults.push(designResult.transition);

  let finalResult = designResult;
  if (args.targetState === "FORMALIZE") {
    const approvalRef = buildArchitectureApprovalReference(args);
    const formalizeResult = await orchestrator.transition({
      task: designResult.task,
      to: "FORMALIZE",
      approvalRef,
      reason: "Live Architect Agent handoff"
    });
    transitionResults.push(formalizeResult.transition);
    finalResult = formalizeResult;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        status: "ok",
        snapshot: snapshotResult,
        transitionLogPath: toRelativeOrAbsolute(rootDir, transitionLogPath),
        taskState: finalResult.task.workflowState,
        output: finalResult.output,
        transitions: transitionResults
      },
      null,
      2
    )}\n`
  );
}

function parseArgs(argv: string[]): CliArgs {
  const defaultEnvironment: EnvironmentName = "local";
  const args: CliArgs = {
    environment: defaultEnvironment,
    targetState: "DESIGN",
    taskId: `task-${Date.now()}`,
    requestedBy: "orchestrator-runner",
    taskTitle: "Live Product Agent run"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const rawArg = argv[index];
    const arg = rawArg?.trim();

    if (!arg) {
      continue;
    }

    // pnpm may forward a standalone "--" separator into script argv.
    if (arg === "--") {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelpAndExit(0);
    }

    if (arg === "--root") {
      args.rootDir = requiredValue(argv, ++index, "--root");
      continue;
    }

    if (arg === "--env") {
      const environmentValue = requiredValue(argv, ++index, "--env");
      if (!SUPPORTED_ENVIRONMENTS.includes(environmentValue as EnvironmentName)) {
        throw new Error(
          `Invalid --env '${environmentValue}'. Allowed: ${SUPPORTED_ENVIRONMENTS.join(", ")}`
        );
      }
      args.environment = environmentValue as EnvironmentName;
      continue;
    }

    if (arg === "--version") {
      args.version = requiredValue(argv, ++index, "--version");
      continue;
    }

    if (arg === "--target-state") {
      const targetState = requiredValue(argv, ++index, "--target-state");
      if (targetState !== "DESIGN" && targetState !== "FORMALIZE") {
        throw new Error(`Invalid --target-state '${targetState}'. Allowed: DESIGN, FORMALIZE`);
      }
      args.targetState = targetState;
      continue;
    }

    if (arg === "--task-id") {
      args.taskId = requiredValue(argv, ++index, "--task-id");
      continue;
    }

    if (arg === "--requested-by") {
      args.requestedBy = requiredValue(argv, ++index, "--requested-by");
      continue;
    }

    if (arg === "--task-title") {
      args.taskTitle = requiredValue(argv, ++index, "--task-title");
      continue;
    }

    if (arg === "--input-file") {
      args.inputFile = requiredValue(argv, ++index, "--input-file");
      continue;
    }

    if (arg === "--input-json") {
      args.inputJson = requiredValue(argv, ++index, "--input-json");
      continue;
    }

    if (arg === "--log-path") {
      args.logPath = requiredValue(argv, ++index, "--log-path");
      continue;
    }

    if (arg === "--approval-id") {
      args.approvalId = requiredValue(argv, ++index, "--approval-id");
      continue;
    }

    if (arg === "--approval-by") {
      args.approvalBy = requiredValue(argv, ++index, "--approval-by");
      continue;
    }

    if (arg === "--approval-at-utc") {
      args.approvalAtUtc = requiredValue(argv, ++index, "--approval-at-utc");
      continue;
    }

    if (arg === "--approval-expires-at-utc") {
      args.approvalExpiresAtUtc = requiredValue(argv, ++index, "--approval-expires-at-utc");
      continue;
    }

    if (arg === "--model") {
      args.model = requiredValue(argv, ++index, "--model");
      continue;
    }

    if (arg === "--temperature") {
      args.temperature = parseFloatArg(requiredValue(argv, ++index, "--temperature"), "--temperature");
      continue;
    }

    if (arg === "--timeout-ms") {
      args.timeoutMs = parseIntArg(requiredValue(argv, ++index, "--timeout-ms"), "--timeout-ms");
      continue;
    }

    throw new Error(`Unknown argument: ${rawArg}`);
  }

  if (args.inputFile && args.inputJson) {
    throw new Error("Use either --input-file or --input-json, not both");
  }

  return args;
}

function requiredValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parseFloatArg(value: string, flag: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric value for ${flag}: ${value}`);
  }
  return parsed;
}

function parseIntArg(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer value for ${flag}: ${value}`);
  }
  return parsed;
}

function buildArchitectureApprovalReference(args: CliArgs): ApprovalReference {
  const nowUtc = new Date().toISOString();

  return {
    approvalId: args.approvalId ?? `appr-arch-${args.taskId}-${Date.now()}`,
    approvalType: "ARCHITECTURE",
    approvedBy: args.approvalBy ?? args.requestedBy,
    approvedAtUtc: args.approvalAtUtc ?? nowUtc,
    status: "approved",
    ...(args.approvalExpiresAtUtc ? { expiresAtUtc: args.approvalExpiresAtUtc } : {})
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

function resolveLogPath(rootDir: string, args: CliArgs, snapshotVersion: string): string {
  if (args.logPath) {
    return isAbsolute(args.logPath) ? args.logPath : join(rootDir, args.logPath);
  }

  return join(
    rootDir,
    "runtime",
    "logs",
    `transition-${args.environment}-${snapshotVersion}-${args.taskId}.jsonl`
  );
}

function toRelativeOrAbsolute(rootDir: string, pathValue: string): string {
  const normalizedRoot = resolve(rootDir);
  const normalizedPath = resolve(pathValue);
  if (normalizedPath.startsWith(`${normalizedRoot}/`)) {
    return normalizedPath.slice(normalizedRoot.length + 1);
  }
  return normalizedPath;
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

function printHelpAndExit(exitCode: number): never {
  const help = [
    "Usage: pnpm --filter @monitor/orchestrator-runner start -- [options]",
    "",
    "Options:",
    "  --root <path>           Repository root (auto-detected if omitted)",
    "  --env <local|dev|staging|prod>   Environment (default: local)",
    "  --version <id>          Config version for snapshot (default: active from manifest)",
    "  --target-state <DESIGN|FORMALIZE> Final workflow state to run to (default: DESIGN)",
    "  --task-id <id>          Task id (default: task-<timestamp>)",
    "  --requested-by <name>   Requested by (default: orchestrator-runner)",
    "  --task-title <text>     Default task title when no input JSON/file is provided",
    "  --input-file <path>     JSON object file for task input",
    "  --input-json <json>     Inline JSON object for task input",
    "  --log-path <path>       Transition JSONL output path",
    "  --approval-id <id>      Approval id used for DESIGN -> FORMALIZE",
    "  --approval-by <name>    Approval actor used for DESIGN -> FORMALIZE",
    "  --approval-at-utc <ts>  Approval UTC timestamp (ISO 8601) used for DESIGN -> FORMALIZE",
    "  --approval-expires-at-utc <ts> Approval expiry UTC timestamp (ISO 8601)",
    "  --model <id>            OpenAI model override",
    "  --temperature <n>       OpenAI temperature override",
    "  --timeout-ms <n>        OpenAI request timeout override",
    "  --help                  Show this help",
    "",
    "Required environment:",
    "  OPENAI_API_KEY (shell env or <repo>/.env)"
  ].join("\n");

  process.stdout.write(`${help}\n`);
  process.exit(exitCode);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);

  const details = getErrorDetails(error);
  if (details.length > 0) {
    process.stderr.write(`Details:\n`);
    for (const detail of details) {
      process.stderr.write(`- ${detail}\n`);
    }
  }

  process.exitCode = 1;
});

function getErrorDetails(error: unknown): string[] {
  if (!error || typeof error !== "object") {
    return [];
  }

  const maybeDetails = (error as { details?: unknown }).details;
  if (!Array.isArray(maybeDetails)) {
    return [];
  }

  return maybeDetails.filter((detail): detail is string => typeof detail === "string" && detail.trim().length > 0);
}
