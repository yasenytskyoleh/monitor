import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { WorkflowTransitionError } from "@monitor/agent-config";
import type { ApprovalReference } from "@monitor/agent-config";
import { OrchestratorCore } from "@monitor/orchestrator-core";
import type {
  AgentOutputEnvelope,
  TaskEnvelope,
  TransitionRecord,
  TransitionResult
} from "@monitor/orchestrator-core";

import { createMockHandlers } from "./mock-handlers.js";
import { resolveScenarioLogPath, toRelativeOrAbsolute } from "./runtime-paths.js";
import type {
  BlockedTransitionInfo,
  CliArgs,
  MockScenario,
  MockScenarioResult,
  RunnerOutput
} from "./types.js";

export type RunModeOptions = {
  args: CliArgs;
  rootDir: string;
  snapshotPath: string;
  snapshotResult: Record<string, unknown>;
  taskInput: Record<string, unknown>;
};

export async function runMockMode(options: RunModeOptions): Promise<RunnerOutput> {
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
        ? await runHappyWorkflow(orchestrator, task, options.args, {
            designReason: "Mock Product handoff",
            formalizeReason: "Mock Architect handoff",
            implementReason: "Mock Quant handoff",
            reviewReason: "Mock Backend handoff",
            approvalReason: "Mock Docs review complete",
            publishReason: "Mock publish approval granted",
            doneReason: "Mock completion",
            architectureApprovalSuffix: "happy"
          })
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

function resolveScenarioList(args: CliArgs): MockScenario[] {
  if (args.scenario === "happy") {
    return ["happy"];
  }
  if (args.scenario === "missing-approval") {
    return ["missing-approval"];
  }
  return ["happy", "missing-approval"];
}

export type HappyWorkflowStepReasons = {
  designReason: string;
  formalizeReason: string;
  implementReason: string;
  reviewReason: string;
  approvalReason: string;
  publishReason: string;
  doneReason: string;
  architectureApprovalSuffix: string;
};

export async function runHappyWorkflow(
  orchestrator: OrchestratorCore,
  initialTask: TaskEnvelope,
  args: CliArgs,
  reasons: HappyWorkflowStepReasons
): Promise<{
  task: TaskEnvelope;
  output?: AgentOutputEnvelope;
  transitions: TransitionRecord[];
}> {
  const results: TransitionResult[] = [];

  let current = await orchestrator.transition({
    task: initialTask,
    to: "DESIGN",
    reason: reasons.designReason
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "FORMALIZE",
    approvalRef: buildArchitectureApprovalReference(args, reasons.architectureApprovalSuffix),
    reason: reasons.formalizeReason
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "IMPLEMENT",
    reason: reasons.implementReason
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "REVIEW",
    reason: reasons.reviewReason
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "APPROVAL",
    reason: reasons.approvalReason
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "PUBLISH_SIGNAL",
    approvalRef: buildSignalPublishApprovalReference(args),
    additionalArtifacts: ["publishable-signal-bundle"],
    reason: reasons.publishReason
  });
  results.push(current);

  current = await orchestrator.transition({
    task: current.task,
    to: "DONE",
    reason: reasons.doneReason
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

export function createInitialTask(
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

function lastDefinedOutput(results: TransitionResult[]): AgentOutputEnvelope | undefined {
  for (let index = results.length - 1; index >= 0; index -= 1) {
    const output = results[index]?.output;
    if (output) {
      return output;
    }
  }
  return undefined;
}

export function buildArchitectureApprovalReference(args: CliArgs, suffix = "live"): ApprovalReference {
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

export function buildSignalPublishApprovalReference(args: CliArgs): ApprovalReference {
  return {
    approvalId: `appr-signal-${args.taskId}-${Date.now()}`,
    approvalType: "SIGNAL_PUBLISH",
    approvedBy: args.approvalBy ?? args.requestedBy,
    approvedAtUtc: args.approvalAtUtc ?? new Date().toISOString(),
    status: "approved",
    ...(args.approvalExpiresAtUtc ? { expiresAtUtc: args.approvalExpiresAtUtc } : {})
  };
}
