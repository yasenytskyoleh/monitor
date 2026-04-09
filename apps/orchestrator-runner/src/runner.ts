import { access, mkdir, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";

import { ConfigReleaseManager } from "@monitor/agent-config";
import { OrchestratorCore } from "@monitor/orchestrator-core";
import type { AgentHandlers } from "@monitor/orchestrator-core";
import type { TransitionRecord } from "@monitor/orchestrator-core";

import { createLiveProductAgentHandler } from "./adapters/live/product-agent.js";
import { parseArgs } from "./cli.js";
import { loadDotEnv, requireOpenAiApiKey } from "./env.js";
import { createMockHandlers } from "./mock-handlers.js";
import { assertSuccessfulResult, formatRunnerOutput } from "./output.js";
import { FileRunStore } from "./persistence/file-run-store.js";
import type {
  PersistedRunRecord,
  PersistedTerminalOutcomeRecord,
  PersistedTransitionRecord,
  RunOutcome
} from "./persistence/types.js";
import { resolveLogPath, toRelativeOrAbsolute } from "./runtime-paths.js";
import { createInitialTask, runHappyWorkflow, runMockMode } from "./scenario-runner.js";
import type { CliArgs, RunnerOutput } from "./types.js";

export type RunnerDependencies = {
  liveProductFetchImpl?: typeof fetch;
  runStore?: FileRunStore;
};

export async function runWithArgv(
  argv: string[],
  startDir = process.cwd(),
  dependencies: RunnerDependencies = {}
): Promise<RunnerOutput> {
  const args = parseArgs(argv);
  const rootDir = args.rootDir ? resolve(args.rootDir) : await findRepoRoot(startDir);
  const runStore = dependencies.runStore ?? new FileRunStore(rootDir);
  const runId = runStore.createRunId();
  const startedAtUtc = runStore.nowIsoUtc();

  let taskInput: Record<string, unknown> | undefined;
  let snapshotMeta: SnapshotMeta | undefined;
  let partialResult: RunnerOutput | undefined;

  try {
    const envLoadResult = await loadDotEnv(rootDir);

    const manager = new ConfigReleaseManager(rootDir);
    const snapshotResult = await manager.compileSnapshot({
      environment: args.environment,
      version: args.version,
      overwrite: true
    });

    const snapshotPath = join(rootDir, snapshotResult.snapshotPath);
    snapshotMeta = await resolveSnapshotMeta(snapshotPath, snapshotResult.version);
    taskInput = await resolveTaskInput(rootDir, args);

    if (args.mode === "mock") {
      partialResult = await runMockMode({
        args,
        rootDir,
        snapshotPath,
        snapshotResult: snapshotResult as unknown as Record<string, unknown>,
        taskInput
      });
    } else {
      partialResult = await runLiveMode({
        args,
        rootDir,
        snapshotPath,
        snapshotResult: snapshotResult as unknown as Record<string, unknown>,
        taskInput,
        openAiApiKey: requireOpenAiApiKey(envLoadResult.loadedFrom),
        fetchImpl: dependencies.liveProductFetchImpl
      });
    }

    assertSuccessfulResult(partialResult);
    const finishedAtUtc = runStore.nowIsoUtc();
    const persistence = await persistSuccessRun({
      runStore,
      runId,
      args,
      startedAtUtc,
      finishedAtUtc,
      result: partialResult,
      snapshotMeta,
      taskInput
    });

    return {
      ...partialResult,
      runId,
      artifactsPath: persistence.artifactsPath,
      outcome: persistence.outcome,
      reason: persistence.reason
    };
  } catch (error) {
    const finishedAtUtc = runStore.nowIsoUtc();
    let artifactsPath = "unavailable";
    try {
      const persistence = await persistFailureRun({
        runStore,
        runId,
        args,
        startedAtUtc,
        finishedAtUtc,
        error,
        partialResult,
        snapshotMeta,
        taskInput
      });
      artifactsPath = persistence.artifactsPath;
    } catch (persistenceError) {
      appendErrorDetails(error, [
        `Persistence failure: ${
          persistenceError instanceof Error ? persistenceError.message : String(persistenceError)
        }`
      ]);
    }

    appendErrorDetails(error, [`Run ID: ${runId}`, `Run artifacts: ${artifactsPath}`]);

    throw error;
  }
}

export async function runCli(argv = process.argv.slice(2), startDir = process.cwd()): Promise<void> {
  const args = parseArgs(argv);
  const result = await runWithArgv(argv, startDir);
  process.stdout.write(`${formatRunnerOutput(result, args.output)}\n`);
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

type PersistSuccessOptions = {
  runStore: FileRunStore;
  runId: string;
  args: CliArgs;
  startedAtUtc: string;
  finishedAtUtc: string;
  result: RunnerOutput;
  snapshotMeta: SnapshotMeta | undefined;
  taskInput: Record<string, unknown> | undefined;
};

type PersistFailureOptions = {
  runStore: FileRunStore;
  runId: string;
  args: CliArgs;
  startedAtUtc: string;
  finishedAtUtc: string;
  error: unknown;
  partialResult: RunnerOutput | undefined;
  snapshotMeta: SnapshotMeta | undefined;
  taskInput: Record<string, unknown> | undefined;
};

type PersistedRunSummary = {
  artifactsPath: string;
  outcome: RunOutcome;
  reason?: string;
};

type SnapshotMeta = {
  version: string;
  promptSetVersion: string;
  schemaVersion: number;
  checksum: string;
  raw: Record<string, unknown>;
};

async function persistSuccessRun(options: PersistSuccessOptions): Promise<PersistedRunSummary> {
  const transitions = buildPersistedTransitions(
    options.runId,
    options.args,
    options.result,
    options.finishedAtUtc
  );
  const outcome = deriveOutcome(options.result.taskState);
  const terminalOutcome = buildTerminalOutcome({
    runId: options.runId,
    finalState: options.result.taskState,
    outcome,
    transitions,
    result: options.result
  });

  const runRecord: PersistedRunRecord = {
    runId: options.runId,
    taskId: options.args.taskId,
    env: options.args.environment,
    mode: options.args.mode,
    ...(options.args.scenario ? { scenario: options.args.scenario } : {}),
    startedAtUtc: options.startedAtUtc,
    finishedAtUtc: options.finishedAtUtc,
    finalState: options.result.taskState,
    outcome,
    configVersion: options.snapshotMeta?.version ?? options.args.version ?? "unknown",
    promptSetVersion: options.snapshotMeta?.promptSetVersion ?? "unknown",
    schemaVersion: options.snapshotMeta?.schemaVersion ?? 1,
    snapshotChecksum: options.snapshotMeta?.checksum ?? "unknown"
  };

  const persisted = await options.runStore.persist({
    runId: options.runId,
    runRecord,
    transitions,
    terminalOutcome,
    ...(options.taskInput ? { inputTask: options.taskInput } : {}),
    ...(options.snapshotMeta ? { compiledSnapshotMeta: options.snapshotMeta.raw } : {})
  });

  return {
    artifactsPath: persisted.relativeRunDir,
    outcome,
    reason: terminalOutcome.reason
  };
}

async function persistFailureRun(options: PersistFailureOptions): Promise<PersistedRunSummary> {
  const transitions = options.partialResult
    ? buildPersistedTransitions(
        options.runId,
        options.args,
        options.partialResult,
        options.finishedAtUtc
      )
    : [];
  const failureReason =
    options.error instanceof Error ? options.error.message : String(options.error);
  const finalState = options.partialResult?.taskState ?? "FAILED";

  const terminalOutcome: PersistedTerminalOutcomeRecord = {
    runId: options.runId,
    finalState,
    outcome: "runtime_failure",
    transitionCount: transitions.length,
    artifactSummary: uniqueStrings(transitions.flatMap((item) => item.artifactRefs)),
    reason: failureReason
  };

  const runRecord: PersistedRunRecord = {
    runId: options.runId,
    taskId: options.args.taskId,
    env: options.args.environment,
    mode: options.args.mode,
    ...(options.args.scenario ? { scenario: options.args.scenario } : {}),
    startedAtUtc: options.startedAtUtc,
    finishedAtUtc: options.finishedAtUtc,
    finalState,
    outcome: "runtime_failure",
    configVersion: options.snapshotMeta?.version ?? options.args.version ?? "unknown",
    promptSetVersion: options.snapshotMeta?.promptSetVersion ?? "unknown",
    schemaVersion: options.snapshotMeta?.schemaVersion ?? 1,
    snapshotChecksum: options.snapshotMeta?.checksum ?? "unknown"
  };

  const persisted = await options.runStore.persist({
    runId: options.runId,
    runRecord,
    transitions,
    terminalOutcome,
    ...(options.taskInput ? { inputTask: options.taskInput } : {}),
    ...(options.snapshotMeta ? { compiledSnapshotMeta: options.snapshotMeta.raw } : {})
  });

  return {
    artifactsPath: persisted.relativeRunDir,
    outcome: "runtime_failure",
    reason: failureReason
  };
}

function buildPersistedTransitions(
  runId: string,
  args: CliArgs,
  result: RunnerOutput,
  fallbackTimestampUtc: string
): PersistedTransitionRecord[] {
  const records: PersistedTransitionRecord[] = [];
  let index = 1;

  if (Array.isArray(result.scenarios) && result.scenarios.length > 0) {
    for (const scenario of result.scenarios) {
      let blockedInserted = false;

      for (const transition of scenario.transitions) {
        records.push(mapTransitionRecord(runId, index, transition, scenario.scenario));
        index += 1;

        if (!blockedInserted && scenario.blockedTransition && transition.to === "DESIGN") {
          records.push({
            runId,
            index,
            from: scenario.blockedTransition.from,
            to: scenario.blockedTransition.to,
            requestedBy: args.requestedBy,
            executedBy: "orchestrator-runner",
            timestampUtc: scenario.blockedTransition.timestampUtc,
            reason: scenario.blockedTransition.error,
            artifactRefs: [],
            blocked: true,
            scenario: scenario.scenario
          });
          blockedInserted = true;
          index += 1;
        }
      }

      if (scenario.blockedTransition && !blockedInserted) {
        records.push({
          runId,
          index,
          from: scenario.blockedTransition.from,
          to: scenario.blockedTransition.to,
          requestedBy: args.requestedBy,
          executedBy: "orchestrator-runner",
          timestampUtc: scenario.blockedTransition.timestampUtc || fallbackTimestampUtc,
          reason: scenario.blockedTransition.error,
          artifactRefs: [],
          blocked: true,
          scenario: scenario.scenario
        });
        index += 1;
      }
    }
    return records;
  }

  for (const transition of result.transitions) {
    records.push(mapTransitionRecord(runId, index, transition));
    index += 1;
  }

  return records;
}

function mapTransitionRecord(
  runId: string,
  index: number,
  transition: TransitionRecord,
  scenario?: string
): PersistedTransitionRecord {
  return {
    runId,
    index,
    from: transition.from,
    to: transition.to,
    requestedBy: transition.requestedBy,
    executedBy: transition.executedBy,
    timestampUtc: transition.timestampUtc,
    ...(transition.approvalRef ? { approvalRef: transition.approvalRef } : {}),
    reason: transition.reason,
    artifactRefs: transition.artifactRefs,
    ...(scenario ? { scenario } : {})
  };
}

function deriveOutcome(finalState: string): RunOutcome {
  if (finalState === "DONE") {
    return "success";
  }
  if (finalState === "REJECTED") {
    return "policy_rejection";
  }
  return "runtime_failure";
}

function buildTerminalOutcome(options: {
  runId: string;
  finalState: string;
  outcome: RunOutcome;
  transitions: PersistedTransitionRecord[];
  result: RunnerOutput;
}): PersistedTerminalOutcomeRecord {
  const artifactSummary = uniqueStrings(options.transitions.flatMap((item) => item.artifactRefs));
  const transitionCount = options.transitions.length;

  if (options.outcome !== "policy_rejection") {
    return {
      runId: options.runId,
      finalState: options.finalState,
      outcome: options.outcome,
      transitionCount,
      artifactSummary
    };
  }

  const rejectedTransition = [...options.transitions]
    .reverse()
    .find((transition) => transition.to === "REJECTED");
  const blockedTransitions = options.transitions.filter((transition) => transition.blocked === true);
  const fallbackReason = blockedTransitions[0]?.reason;
  const rawReason = rejectedTransition?.reason ?? fallbackReason ?? "Task rejected";
  const rejectionCode = extractRejectionCode(rawReason, blockedTransitions);
  const reason = stripRejectionCodePrefix(rawReason);

  return {
    runId: options.runId,
    finalState: options.finalState,
    outcome: options.outcome,
    transitionCount,
    artifactSummary,
    reason,
    ...(rejectionCode ? { rejectionCode } : {}),
    ...(blockedTransitions.length > 0
      ? {
          blockingReferences: blockedTransitions.map((item) => ({
            from: item.from,
            to: item.to,
            error: item.reason
          }))
        }
      : {})
  };
}

function extractRejectionCode(
  reason: string,
  blockedTransitions: PersistedTransitionRecord[]
): string | undefined {
  const prefixed = reason.match(/^([A-Z_]+):/u);
  if (prefixed?.[1]) {
    return prefixed[1];
  }

  const blockedReason = blockedTransitions[0]?.reason.toLowerCase();
  if (blockedReason?.includes("approval")) {
    return "MISSING_APPROVAL";
  }

  return undefined;
}

function stripRejectionCodePrefix(reason: string): string {
  return reason.replace(/^[A-Z_]+:\s*/u, "").trim();
}

function appendErrorDetails(error: unknown, details: string[]): void {
  if (!error || typeof error !== "object") {
    return;
  }

  const record = error as { details?: unknown };
  const existing = Array.isArray(record.details)
    ? record.details.filter((item): item is string => typeof item === "string")
    : [];
  record.details = [...existing, ...details];
}

async function resolveSnapshotMeta(snapshotPath: string, fallbackVersion: string): Promise<SnapshotMeta> {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(await readFile(snapshotPath, "utf8")) as Record<string, unknown>;
  } catch {
    return {
      version: fallbackVersion,
      promptSetVersion: "unknown",
      schemaVersion: 1,
      checksum: "unknown",
      raw: {
        version: fallbackVersion
      }
    };
  }

  return {
    version: getStringOrFallback(raw.version, fallbackVersion),
    promptSetVersion: getStringOrFallback(raw.promptSetVersion, "unknown"),
    schemaVersion: getNumberOrFallback(raw.schemaVersion, 1),
    checksum: getStringOrFallback(raw.checksum, "unknown"),
    raw
  };
}

function getStringOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function getNumberOrFallback(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
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
