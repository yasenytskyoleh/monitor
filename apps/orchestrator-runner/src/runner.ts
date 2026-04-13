import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import process from "node:process";

import { WorkflowTransitionError } from "@monitor/agent-config";
import { ConfigReleaseManager } from "@monitor/agent-config";
import type { TransitionRecord } from "@monitor/orchestrator-core";

import { isPolicyApprovalError } from "./approvals/types.js";
import { parseArgs } from "./cli.js";
import { loadDotEnv, requireOpenAiApiKey } from "./env.js";
import type { WorkflowArtifact } from "./artifacts/types.js";
import { isBackendPatchError } from "./backend-patch/errors.js";
import type { PatchResultEvidence } from "./backend-patch/types.js";
import type { RollbackPlanEvidence, RollbackResultEvidence } from "./backend-rollback/types.js";
import type { VerificationResultEvidence } from "./backend-verification/types.js";
import {
  hasLiveAgents,
  resolveAgentExecutionMap,
  SUPPORTED_AGENT_IDS
} from "./handlers/agent-modes.js";
import { resolveHandlers } from "./handlers/resolve-handlers.js";
import { assertSuccessfulResult, formatRunnerOutput } from "./output.js";
import { FileRunStore } from "./persistence/file-run-store.js";
import type {
  PersistedRunRecord,
  PersistedTerminalOutcomeRecord,
  PersistedTransitionRecord,
  RunOutcome
} from "./persistence/types.js";
import { runScenarioMode } from "./scenario-runner.js";
import { buildStabilitySummary } from "./stability/build-stability-summary.js";
import type { AgentExecutionMap, CliArgs, RunnerOutput } from "./types.js";

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
  let agentModes: AgentExecutionMap | undefined;
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
    agentModes = resolveAgentExecutionMap(args.mode, args.agentModeOverrides);
    const openAiApiKey = hasLiveAgents(agentModes)
      ? requireOpenAiApiKey(envLoadResult.loadedFrom)
      : undefined;
    const resolvedHandlers = resolveHandlers({
      rootDir,
      agentModes,
      openAiApiKey,
      backendDryRun: args.backendWrite === "dry-run",
      backendRollbackMode: args.backendRollbackMode,
      backendVerificationMode: args.backendVerificationMode,
      model: args.model,
      temperature: args.temperature,
      timeoutMs: args.timeoutMs,
      fetchImpl: dependencies.liveProductFetchImpl
    });

    partialResult = await runScenarioMode({
      args,
      rootDir,
      snapshotPath,
      snapshotResult: snapshotResult as unknown as Record<string, unknown>,
      taskInput,
      handlers: resolvedHandlers.handlers,
      executedBy: resolvedHandlers.executedBy,
      runId
    });

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
      taskInput,
      agentModes
    });

    return {
      ...partialResult,
      runId,
      artifactsPath: persistence.artifactsPath,
      outcome: persistence.outcome,
      reason: persistence.reason,
      agentModes
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
        taskInput,
        agentModes
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

type PersistSuccessOptions = {
  runStore: FileRunStore;
  runId: string;
  args: CliArgs;
  startedAtUtc: string;
  finishedAtUtc: string;
  result: RunnerOutput;
  snapshotMeta: SnapshotMeta | undefined;
  taskInput: Record<string, unknown> | undefined;
  agentModes: AgentExecutionMap | undefined;
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
  agentModes: AgentExecutionMap | undefined;
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
  const stabilitySummary = buildStabilitySummary({
    runId: options.runId,
    mode: options.args.mode,
    finalState: options.result.taskState,
    outcome,
    scenarios: options.result.scenarios?.map((item) => ({
      scenario: item.scenario,
      finalState: item.finalState
    })),
    patchResults: options.result.patchResults,
    verificationResults: options.result.verificationResults,
    rollbackResults: options.result.rollbackResults
  });

  const runRecord: PersistedRunRecord = {
    runId: options.runId,
    taskId: options.args.taskId,
    env: options.args.environment,
    mode: options.args.mode,
    agentModes: buildPersistedAgentModes(options.args, options.agentModes),
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
    approvals: options.result.approvals,
    artifacts: options.result.artifacts,
    patchPlans: options.result.patchPlans,
    patchResults: options.result.patchResults,
    rollbackPlans: options.result.rollbackPlans,
    rollbackResults: options.result.rollbackResults,
    verificationResults: options.result.verificationResults,
    stabilitySummary,
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
  const failureOutcome = classifyFailureOutcome(options.error);
  const finalState =
    options.partialResult?.taskState ?? (failureOutcome === "policy_rejection" ? "REJECTED" : "FAILED");

  const terminalOutcome: PersistedTerminalOutcomeRecord = {
    runId: options.runId,
    finalState,
    outcome: failureOutcome,
    transitionCount: transitions.length,
    artifactSummary: summarizeArtifactTypes(options.partialResult?.artifacts),
    reason: failureReason,
    ...(failureOutcome === "policy_rejection"
      ? { rejectionCode: extractFailureRejectionCode(options.error) }
      : {})
  };

  const runRecord: PersistedRunRecord = {
    runId: options.runId,
    taskId: options.args.taskId,
    env: options.args.environment,
    mode: options.args.mode,
    agentModes: buildPersistedAgentModes(options.args, options.agentModes),
    ...(options.args.scenario ? { scenario: options.args.scenario } : {}),
    startedAtUtc: options.startedAtUtc,
    finishedAtUtc: options.finishedAtUtc,
    finalState,
    outcome: failureOutcome,
    configVersion: options.snapshotMeta?.version ?? options.args.version ?? "unknown",
    promptSetVersion: options.snapshotMeta?.promptSetVersion ?? "unknown",
    schemaVersion: options.snapshotMeta?.schemaVersion ?? 1,
    snapshotChecksum: options.snapshotMeta?.checksum ?? "unknown"
  };

  const patchResults = options.partialResult?.patchResults ?? inferFailurePatchResults(options.error, options.args.taskId);
  const rollbackPlans = options.partialResult?.rollbackPlans ?? inferFailureRollbackPlans(options.error, options.args.taskId);
  const rollbackResults =
    options.partialResult?.rollbackResults ?? inferFailureRollbackResults(options.error, options.args.taskId);
  const verificationResults =
    options.partialResult?.verificationResults ??
    inferFailureVerificationResults(options.error, options.args.taskId);
  const stabilitySummary = buildStabilitySummary({
    runId: options.runId,
    mode: options.args.mode,
    finalState,
    outcome: failureOutcome,
    scenarios: options.partialResult?.scenarios?.map((item) => ({
      scenario: item.scenario,
      finalState: item.finalState
    })),
    patchResults,
    verificationResults,
    rollbackResults
  });

  const persisted = await options.runStore.persist({
    runId: options.runId,
    runRecord,
    transitions,
    terminalOutcome,
    approvals: options.partialResult?.approvals ?? [],
    artifacts: options.partialResult?.artifacts ?? [],
    patchPlans: options.partialResult?.patchPlans ?? [],
    patchResults,
    rollbackPlans,
    rollbackResults,
    verificationResults,
    stabilitySummary,
    ...(options.taskInput ? { inputTask: options.taskInput } : {}),
    ...(options.snapshotMeta ? { compiledSnapshotMeta: options.snapshotMeta.raw } : {})
  });

  return {
    artifactsPath: persisted.relativeRunDir,
    outcome: failureOutcome,
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
        records.push(
          mapTransitionRecord(
            runId,
            index,
            transition,
            scenario.scenario,
            scenario.approvalEvidenceByTransitionChecksum[transition.transitionChecksum]
          )
        );
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
            validationStatus: "blocked",
            evidenceSummary: scenario.blockedTransition.error,
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
          validationStatus: "blocked",
          evidenceSummary: scenario.blockedTransition.error,
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
    records.push(
      mapTransitionRecord(
        runId,
        index,
        transition,
        undefined,
        result.approvalEvidenceByTransitionChecksum[transition.transitionChecksum]
      )
    );
    index += 1;
  }

  return records;
}

function mapTransitionRecord(
  runId: string,
  index: number,
  transition: TransitionRecord,
  scenario?: string,
  approvalEvidence?: RunnerOutput["approvalEvidenceByTransitionChecksum"][string]
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
    ...(approvalEvidence?.approvalType
      ? { approvalType: approvalEvidence.approvalType }
      : transition.approvalRef?.approvalType
        ? { approvalType: transition.approvalRef.approvalType }
        : {}),
    ...(approvalEvidence?.validationStatus ? { validationStatus: approvalEvidence.validationStatus } : {}),
    ...(approvalEvidence?.evidenceSummary ? { evidenceSummary: approvalEvidence.evidenceSummary } : {}),
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
  const artifactSummary = summarizeArtifactTypes(options.result.artifacts);
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

function summarizeArtifactTypes(artifacts: WorkflowArtifact[] | undefined): string[] {
  if (!artifacts || artifacts.length === 0) {
    return [];
  }
  return uniqueStrings(artifacts.map((artifact) => artifact.artifactType));
}

function classifyFailureOutcome(error: unknown): RunOutcome {
  if (error instanceof WorkflowTransitionError || isPolicyApprovalError(error)) {
    return "policy_rejection";
  }
  return "runtime_failure";
}

function extractFailureRejectionCode(error: unknown): string | undefined {
  if (isPolicyApprovalError(error)) {
    return error.code;
  }

  if (error instanceof WorkflowTransitionError) {
    const normalized = error.message.toLowerCase();
    if (normalized.includes("approval")) {
      return "MISSING_APPROVAL";
    }
    if (normalized.includes("not allowed")) {
      return "INVALID_TRANSITION";
    }
  }

  return undefined;
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

function inferFailurePatchResults(error: unknown, taskId: string): PatchResultEvidence[] {
  const metadata = extractBackendPatchMetadata(error);
  const result = metadata?.patchResult as PatchResultEvidence | undefined;
  if (result) {
    return [result];
  }

  if (!isBackendPatchError(error)) {
    return [];
  }

  return [
    {
      taskId,
      applyMode: "dry-run",
      applied: false,
      changedFiles: [],
      createdFiles: [],
      updatedFiles: [],
      postApplyValidationPassed: false,
      failureCategory: error.failureCategory,
      failureReason: error.message
    }
  ];
}

function inferFailureVerificationResults(
  error: unknown,
  taskId: string
): VerificationResultEvidence[] {
  const metadata = extractBackendPatchMetadata(error);
  const result = metadata?.verificationResult as VerificationResultEvidence | undefined;
  if (result) {
    return [result];
  }

  if (!isBackendPatchError(error)) {
    return [];
  }

  return [
    {
      taskId,
      applied: false,
      hooksRequested: [],
      hooksExecuted: [],
      overallStatus: "failed"
    }
  ];
}

function inferFailureRollbackPlans(error: unknown, _taskId: string): RollbackPlanEvidence[] {
  const metadata = extractBackendPatchMetadata(error);
  const plan = metadata?.rollbackPlan as RollbackPlanEvidence | undefined;
  if (plan) {
    return [plan];
  }
  return [];
}

function inferFailureRollbackResults(error: unknown, taskId: string): RollbackResultEvidence[] {
  const metadata = extractBackendPatchMetadata(error);
  const result = metadata?.rollbackResult as RollbackResultEvidence | undefined;
  if (result) {
    return [result];
  }

  if (!isBackendPatchError(error)) {
    return [];
  }

  return [
    {
      taskId,
      rollbackAttempted: false,
      triggerReason: null,
      restoredFiles: [],
      deletedCreatedFiles: [],
      status: "skipped",
      failureReason: null
    }
  ];
}

function extractBackendPatchMetadata(error: unknown): Record<string, unknown> | undefined {
  if (!isBackendPatchError(error)) {
    return undefined;
  }
  const metadata = (error as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }
  return metadata as Record<string, unknown>;
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

function buildPersistedAgentModes(
  args: CliArgs,
  resolved: AgentExecutionMap | undefined
): AgentExecutionMap {
  if (resolved) {
    return resolved;
  }

  const defaults: AgentExecutionMap = {
    "product-agent": args.mode === "live" ? "live" : "mock",
    "architect-agent": args.mode === "live" ? "live" : "mock",
    "quant-pattern-agent": args.mode === "live" ? "live" : "mock",
    "backend-agent": args.mode === "live" ? "live" : "mock",
    "docs-reviewer-agent": args.mode === "live" ? "live" : "mock"
  };

  for (const agentId of SUPPORTED_AGENT_IDS) {
    const override = args.agentModeOverrides[agentId];
    if (override === "mock" || override === "live") {
      defaults[agentId] = override;
    }
  }

  return defaults;
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
