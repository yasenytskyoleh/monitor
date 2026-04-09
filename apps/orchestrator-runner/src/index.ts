#!/usr/bin/env node
import { access, mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, parse as parsePath, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  ConfigReleaseManager,
  SUPPORTED_ENVIRONMENTS,
  WorkflowTransitionError
} from "@monitor/agent-config";
import type { ApprovalReference } from "@monitor/agent-config";
import type { EnvironmentName } from "@monitor/agent-config";
import { OrchestratorCore } from "@monitor/orchestrator-core";
import type {
  AgentHandlers,
  AgentOutputEnvelope,
  TaskEnvelope,
  TransitionRecord,
  TransitionResult
} from "@monitor/orchestrator-core";
import { loadDotEnv } from "./env.js";

type RunnerMode = "live" | "mock";
type TargetState = "DESIGN" | "FORMALIZE";
type MockScenario = "happy" | "missing-approval";
type MockScenarioSelection = MockScenario | "both";

type BlockedTransitionInfo = {
  from: string;
  to: string;
  error: string;
};

type MockScenarioResult = {
  scenario: MockScenario;
  status: "ok";
  finalState: string;
  output?: AgentOutputEnvelope;
  transitions: TransitionRecord[];
  transitionLogPath: string;
  blockedTransition?: BlockedTransitionInfo;
};

export type RunnerOutput = {
  status: "ok";
  snapshot: Record<string, unknown>;
  transitionLogPath: string;
  taskState: string;
  output?: AgentOutputEnvelope;
  transitions: TransitionRecord[];
  scenarios?: MockScenarioResult[];
};

export type CliArgs = {
  rootDir?: string;
  mode: RunnerMode;
  scenario?: MockScenarioSelection;
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
};

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

  const result = await runLiveMode({
    args,
    rootDir,
    snapshotPath,
    snapshotResult: snapshotResult as unknown as Record<string, unknown>,
    taskInput
  });
  assertSuccessfulResult(result);
  return result;
}

export async function runCli(argv = process.argv.slice(2), startDir = process.cwd()): Promise<void> {
  const result = await runWithArgv(argv, startDir);
  process.stdout.write(`${formatRunnerOutput(result)}\n`);
}

type RunModeOptions = {
  args: CliArgs;
  rootDir: string;
  snapshotPath: string;
  snapshotResult: Record<string, unknown>;
  taskInput: Record<string, unknown>;
};
async function runLiveMode(_options: RunModeOptions): Promise<RunnerOutput> {
  throw new Error("Mode 'live' is not implemented in this milestone. Use --mode mock.");
}

async function runMockMode(options: RunModeOptions): Promise<RunnerOutput> {
  const scenarios = resolveScenarioList(options.args);
  const scenarioResults: MockScenarioResult[] = [];

  for (const scenario of scenarios) {
    const transitionLogPath = resolveScenarioLogPath(
      options.rootDir,
      options.args,
      String(options.snapshotResult.version ?? options.args.version ?? "v1"),
      scenario
    );
    await mkdir(dirname(transitionLogPath), { recursive: true });

    const orchestrator = await OrchestratorCore.fromSnapshotFile({
      snapshotPath: options.snapshotPath,
      transitionLogPath,
      handlers: createMockHandlers(),
      executedBy: "orchestrator-runner-mock"
    });

    const task = createInitialTask(
      options.args,
      String(options.snapshotResult.version ?? "v1"),
      options.taskInput
    );

    const scenarioResult: {
      task: TaskEnvelope;
      output?: AgentOutputEnvelope;
      transitions: TransitionRecord[];
      blockedTransition?: BlockedTransitionInfo;
    } =
      scenario === "happy"
        ? await runMockHappyScenario(orchestrator, task, options.args)
        : await runMockMissingApprovalScenario(orchestrator, task, options.args);

    scenarioResults.push({
      scenario,
      status: "ok",
      finalState: scenarioResult.task.workflowState,
      output: scenarioResult.output,
      transitions: scenarioResult.transitions,
      transitionLogPath: toRelativeOrAbsolute(options.rootDir, transitionLogPath),
      ...(scenarioResult.blockedTransition ? { blockedTransition: scenarioResult.blockedTransition } : {})
    });
  }

  const lastScenario = scenarioResults[scenarioResults.length - 1];
  if (!lastScenario) {
    throw new Error("No mock scenario result produced");
  }

  return {
    status: "ok",
    snapshot: options.snapshotResult,
    transitionLogPath: lastScenario.transitionLogPath,
    taskState: lastScenario.finalState,
    output: lastScenario.output,
    transitions: lastScenario.transitions,
    scenarios: scenarioResults
  };
}

async function runMockHappyScenario(
  orchestrator: OrchestratorCore,
  initialTask: TaskEnvelope,
  args: CliArgs
): Promise<{
  task: TaskEnvelope;
  output?: AgentOutputEnvelope;
  transitions: TransitionRecord[];
}> {
  const results: TransitionResult[] = [];

  let current = await orchestrator.transition({
    task: initialTask,
    to: "DESIGN",
    reason: "Mock Product handoff"
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "FORMALIZE",
    approvalRef: buildArchitectureApprovalReference(args, "happy"),
    reason: "Mock Architect handoff"
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "IMPLEMENT",
    reason: "Mock Quant handoff"
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "REVIEW",
    reason: "Mock Backend handoff"
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "APPROVAL",
    reason: "Mock Docs review complete"
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "PUBLISH_SIGNAL",
    approvalRef: buildSignalPublishApprovalReference(args),
    additionalArtifacts: ["publishable-signal-bundle"],
    reason: "Mock publish approval granted"
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "DONE",
    reason: "Mock completion"
  });
  results.push(current);

  return {
    task: current.task,
    output: lastDefinedOutput(results),
    transitions: results.map((result) => result.transition)
  };
}

async function runMockMissingApprovalScenario(
  orchestrator: OrchestratorCore,
  initialTask: TaskEnvelope,
  args: CliArgs
): Promise<{
  task: TaskEnvelope;
  output?: AgentOutputEnvelope;
  transitions: TransitionRecord[];
  blockedTransition: BlockedTransitionInfo;
}> {
  const results: TransitionResult[] = [];

  const designResult = await orchestrator.transition({
    task: initialTask,
    to: "DESIGN",
    reason: "Mock Product handoff"
  });
  results.push(designResult);

  let blockedTransition: BlockedTransitionInfo | undefined;
  try {
    await orchestrator.transition({
      task: designResult.task,
      to: "FORMALIZE",
      reason: "Probe missing architecture approval"
    });
    throw new Error("Expected missing-approval transition to fail");
  } catch (error) {
    if (!(error instanceof WorkflowTransitionError)) {
      throw error;
    }

    blockedTransition = {
      from: "DESIGN",
      to: "FORMALIZE",
      error: error.message
    };
  }

  const rejectedResult = await orchestrator.transition({
    task: designResult.task,
    to: "REJECTED",
    reason: `MISSING_APPROVAL: ${blockedTransition?.error ?? "DESIGN -> FORMALIZE approval missing"}`
  });
  results.push(rejectedResult);

  return {
    task: rejectedResult.task,
    output: lastDefinedOutput(results),
    transitions: results.map((result) => result.transition),
    blockedTransition: blockedTransition ?? {
      from: "DESIGN",
      to: "FORMALIZE",
      error: "Missing approval"
    }
  };
}

function createMockHandlers(): AgentHandlers {
  return {
    "product-agent": async (context) => ({
      taskId: context.task.taskId,
      agentRole: "PRODUCT",
      status: "completed",
      summary: "Mock product scope prepared",
      artifacts: ["product-brief"],
      nextAction: "handoff_to_architect"
    }),
    "architect-agent": async (context) => {
      if (context.targetState === "REJECTED") {
        return {
          taskId: context.task.taskId,
          agentRole: "ARCHITECT",
          status: "rejected",
          summary: "Mock rejection due to missing architecture approval",
          artifacts: ["rejection-note"],
          nextAction: "reject_task"
        };
      }

      return {
        taskId: context.task.taskId,
        agentRole: "ARCHITECT",
        status: "completed",
        summary: "Mock architecture prepared",
        artifacts: ["adr-draft", "architecture-design"],
        nextAction: "handoff_to_quant"
      };
    },
    "quant-pattern-agent": async (context) => ({
      taskId: context.task.taskId,
      agentRole: "QUANT_PATTERN",
      status: "completed",
      summary: "Mock pattern formalized",
      artifacts: ["pattern-definition", "metrics-plan"],
      nextAction: "handoff_to_backend"
    }),
    "backend-agent": async (context) => ({
      taskId: context.task.taskId,
      agentRole: "BACKEND",
      status: "completed",
      summary: "Mock implementation complete",
      artifacts: ["code-change", "implementation-notes", "tests"],
      nextAction: "handoff_to_docs_reviewer"
    }),
    "docs-reviewer-agent": async (context) => ({
      taskId: context.task.taskId,
      agentRole: "DOCS_REVIEWER",
      status: "completed",
      summary: "Mock review complete",
      artifacts: ["review-report", "docs-update"],
      nextAction: "await_approval"
    })
  };
}

function lastDefinedOutput(results: TransitionResult[]): AgentOutputEnvelope | undefined {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const output = results[index]?.output;
    if (output) {
      return output;
    }
  }
  return undefined;
}

function createInitialTask(
  args: CliArgs,
  configVersion: string,
  input: Record<string, unknown>
): TaskEnvelope {
  return {
    taskId: args.taskId,
    requestedBy: args.requestedBy,
    workflowState: "INTAKE",
    input,
    configVersion,
    artifactRefs: []
  };
}

function resolveScenarioList(args: CliArgs): MockScenario[] {
  if (args.scenario === "happy") {
    return ["happy"];
  }
  if (args.scenario === "missing-approval") {
    return ["missing-approval"];
  }
  return ["happy", "missing-approval"];
}

export function parseArgs(argv: string[]): CliArgs {
  const defaultEnvironment: EnvironmentName = "local";
  const args: CliArgs = {
    mode: "live",
    environment: defaultEnvironment,
    targetState: "DESIGN",
    taskId: `task-${Date.now()}`,
    requestedBy: "orchestrator-runner",
    taskTitle: "Orchestration run"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const rawArg = argv[index];
    const arg = rawArg?.trim();

    if (!arg) {
      continue;
    }

    if (arg === "--") {
      continue;
    }

    if (
      (arg === "run" || arg === "start") &&
      (index === 0 || (index > 0 && argv[index - 1] === "--"))
    ) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelpAndExit(0);
    }

    if (arg === "--root") {
      args.rootDir = requiredValue(argv, ++index, "--root");
      continue;
    }

    if (arg === "--mode") {
      const mode = requiredValue(argv, ++index, "--mode");
      if (mode !== "live" && mode !== "mock") {
        throw new Error(`Invalid --mode '${mode}'. Allowed: live, mock`);
      }
      args.mode = mode;
      continue;
    }

    if (arg === "--scenario") {
      const scenario = requiredValue(argv, ++index, "--scenario");
      if (scenario !== "happy" && scenario !== "missing-approval" && scenario !== "both") {
        throw new Error(`Invalid --scenario '${scenario}'. Allowed: happy, missing-approval, both`);
      }
      args.scenario = scenario;
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

    if (arg === "--model" || arg === "--temperature" || arg === "--timeout-ms") {
      requiredValue(argv, ++index, arg);
      continue;
    }

    throw new Error(`Unknown argument: ${rawArg}`);
  }

  if (args.inputFile && args.inputJson) {
    throw new Error("Use either --input-file or --input-json, not both");
  }

  if (args.mode === "mock" && !args.scenario) {
    args.scenario = "both";
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

function buildArchitectureApprovalReference(args: CliArgs, suffix = "live"): ApprovalReference {
  const nowUtc = new Date().toISOString();

  return {
    approvalId: args.approvalId ?? `appr-arch-${args.taskId}-${suffix}-${Date.now()}`,
    approvalType: "ARCHITECTURE",
    approvedBy: args.approvalBy ?? args.requestedBy,
    approvedAtUtc: args.approvalAtUtc ?? nowUtc,
    status: "approved",
    ...(args.approvalExpiresAtUtc ? { expiresAtUtc: args.approvalExpiresAtUtc } : {})
  };
}

function buildSignalPublishApprovalReference(args: CliArgs): ApprovalReference {
  return {
    approvalId: `appr-signal-${args.taskId}-${Date.now()}`,
    approvalType: "SIGNAL_PUBLISH",
    approvedBy: args.approvalBy ?? args.requestedBy,
    approvedAtUtc: args.approvalAtUtc ?? new Date().toISOString(),
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

function resolveScenarioLogPath(
  rootDir: string,
  args: CliArgs,
  snapshotVersion: string,
  scenario: MockScenario
): string {
  const basePath = resolveLogPath(rootDir, args, snapshotVersion);
  return appendPathSuffix(basePath, scenario);
}

function appendPathSuffix(pathValue: string, suffix: string): string {
  const parsed = parsePath(pathValue);
  if (parsed.ext.length > 0) {
    return join(parsed.dir, `${parsed.name}-${suffix}${parsed.ext}`);
  }

  return join(parsed.dir, `${parsed.base}-${suffix}.jsonl`);
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
    "Usage: pnpm runner run [options]",
    "",
    "Options:",
    "  --root <path>           Repository root (auto-detected if omitted)",
    "  --mode <live|mock>      Runner mode (default: live)",
    "  --scenario <happy|missing-approval|both> Mock mode scenario selector (default: both)",
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
    "  --model <id>            Reserved for future live mode",
    "  --temperature <n>       Reserved for future live mode",
    "  --timeout-ms <n>        Reserved for future live mode",
    "  --help                  Show this help",
    "",
    "Notes:",
    "  live mode is a stub in this milestone; use --mode mock."
  ].join("\n");

  process.stdout.write(`${help}\n`);
  process.exit(exitCode);
}

function formatRunnerOutput(result: RunnerOutput): string {
  const lines: string[] = [];
  lines.push("Run completed");

  if (Array.isArray(result.scenarios) && result.scenarios.length > 0) {
    for (const scenario of result.scenarios) {
      lines.push(`Scenario: ${scenario.scenario}`);
      lines.push(`Final state: ${scenario.finalState}`);
      lines.push(`Outcome: ${outcomeFromState(scenario.finalState)}`);
      lines.push(`Transitions: ${scenario.transitions.length}`);
      lines.push(`Transition log: ${scenario.transitionLogPath}`);
      if (scenario.blockedTransition) {
        lines.push(
          `Blocked transition: ${scenario.blockedTransition.from} -> ${scenario.blockedTransition.to}`
        );
        lines.push(`Reason: ${scenario.blockedTransition.error}`);
      }
    }
  } else {
    lines.push(`Final state: ${result.taskState}`);
    lines.push(`Outcome: ${outcomeFromState(result.taskState)}`);
    lines.push(`Transitions: ${result.transitions.length}`);
    lines.push(`Transition log: ${result.transitionLogPath}`);
  }

  return lines.join("\n");
}

function outcomeFromState(state: string): "success" | "policy_rejection" | "incomplete" {
  if (state === "DONE") {
    return "success";
  }
  if (state === "REJECTED") {
    return "policy_rejection";
  }
  return "incomplete";
}

function isSuccessTerminalState(state: string): boolean {
  return state === "DONE" || state === "REJECTED";
}

function assertSuccessfulResult(result: RunnerOutput): void {
  if (Array.isArray(result.scenarios) && result.scenarios.length > 0) {
    for (const scenario of result.scenarios) {
      if (!isSuccessTerminalState(scenario.finalState)) {
        throw new Error(
          `Scenario '${scenario.scenario}' ended in non-terminal state '${scenario.finalState}'`
        );
      }
    }
    return;
  }

  if (!isSuccessTerminalState(result.taskState)) {
    throw new Error(`Run ended in non-terminal state '${result.taskState}'`);
  }
}

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

function handleCliError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);

  const details = getErrorDetails(error);
  if (details.length > 0) {
    process.stderr.write("Details:\n");
    for (const detail of details) {
      process.stderr.write(`- ${detail}\n`);
    }
  }

  process.exitCode = 1;
}

const isMainModule =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  runCli().catch(handleCliError);
}
