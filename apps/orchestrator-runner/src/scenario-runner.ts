import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { WorkflowTransitionError } from "@monitor/agent-config";
import type { ApprovalReference, RuntimeConfigSnapshot } from "@monitor/agent-config";
import { OrchestratorCore } from "@monitor/orchestrator-core";
import type {
  AgentOutputEnvelope,
  AgentHandlers,
  TaskEnvelope,
  TransitionRecord,
  TransitionResult
} from "@monitor/orchestrator-core";

import { ArtifactRegistry } from "./artifacts/registry.js";
import type { WorkflowArtifact } from "./artifacts/types.js";
import { validateTransitionArtifacts } from "./artifacts/validate-artifacts.js";
import { extractPatchPlanEvidenceFromBackendOutput, type PatchPlanEvidence } from "./backend-patch/types.js";
import { ApprovalRegistry } from "./approvals/registry.js";
import { approvalEvidenceByTransitionChecksum } from "./approvals/validate-approval.js";
import {
  ApprovalValidationError,
  type ApprovalTransitionEvidence,
  type WorkflowApproval
} from "./approvals/types.js";
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
  handlers: AgentHandlers;
  executedBy: string;
  runId: string;
};

export async function runScenarioMode(options: RunModeOptions): Promise<RunnerOutput> {
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
      handlers: options.handlers,
      executedBy: options.executedBy
    });

    const task = createInitialTask(
      options.args,
      String(options.snapshotResult.version ?? "v1"),
      options.taskInput
    );
    const artifactRegistry = new ArtifactRegistry({
      runId: options.runId,
      taskId: task.taskId,
      scenario
    });
    const scenarioContext: ScenarioExecutionContext = {
      scenario,
      orchestrator,
      snapshot: orchestrator.getSnapshot(),
      registry: artifactRegistry,
      approvals: new ApprovalRegistry(orchestrator.getSnapshot(), options.runId),
      approvalEvidenceByTransitionChecksum: {},
      patchPlans: [],
      transitions: [],
      results: []
    };

    const scenarioResult: {
      task: TaskEnvelope;
      output?: AgentOutputEnvelope;
      approvals: WorkflowApproval[];
      approvalEvidenceByTransitionChecksum: Record<string, ApprovalTransitionEvidence>;
      patchPlans: PatchPlanEvidence[];
      artifacts: WorkflowArtifact[];
      transitions: TransitionRecord[];
      blockedTransition?: BlockedTransitionInfo;
    } =
      scenario === "happy"
        ? await runHappyWorkflow(scenarioContext, task, options.args, {
            designReason: "Mock Product handoff",
            formalizeReason: "Mock Architect handoff",
            implementReason: "Mock Quant handoff",
            reviewReason: "Mock Backend handoff",
            approvalReason: "Mock Docs review complete",
            publishReason: "Mock publish approval granted",
            doneReason: "Mock completion",
            architectureApprovalSuffix: "happy"
          })
        : await runMockMissingApprovalScenario(scenarioContext, task, options.args);

    scenarioResults.push({
      scenario,
      status: "ok",
      finalState: scenarioResult.task.workflowState,
      output: scenarioResult.output,
      approvals: scenarioResult.approvals,
      approvalEvidenceByTransitionChecksum: scenarioResult.approvalEvidenceByTransitionChecksum,
      patchPlans: scenarioResult.patchPlans,
      artifacts: scenarioResult.artifacts,
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
    approvals: scenarioResults.flatMap((scenarioResult) => scenarioResult.approvals),
    approvalEvidenceByTransitionChecksum: Object.assign(
      {},
      ...scenarioResults.map((scenarioResult) => scenarioResult.approvalEvidenceByTransitionChecksum)
    ),
    patchPlans: scenarioResults.flatMap((scenarioResult) => scenarioResult.patchPlans),
    artifacts: scenarioResults.flatMap((scenarioResult) => scenarioResult.artifacts),
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
  if (args.scenario === "both") {
    return ["happy", "missing-approval"];
  }
  if (args.mode === "live") {
    return ["happy"];
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
  scenarioContext: ScenarioExecutionContext,
  initialTask: TaskEnvelope,
  args: CliArgs,
  reasons: HappyWorkflowStepReasons
): Promise<{
  task: TaskEnvelope;
  output?: AgentOutputEnvelope;
  approvals: WorkflowApproval[];
  approvalEvidenceByTransitionChecksum: Record<string, ApprovalTransitionEvidence>;
  patchPlans: PatchPlanEvidence[];
  artifacts: WorkflowArtifact[];
  transitions: TransitionRecord[];
}> {
  let current = await executeAndCollectTransition(scenarioContext, {
    task: initialTask,
    to: "DESIGN",
    reason: reasons.designReason
  });

  current = await executeAndCollectTransition(scenarioContext, {
    task: current.task,
    to: "FORMALIZE",
    approvalRef: buildArchitectureApprovalReference(args, reasons.architectureApprovalSuffix),
    reason: reasons.formalizeReason
  });

  current = await executeAndCollectTransition(scenarioContext, {
    task: current.task,
    to: "IMPLEMENT",
    reason: reasons.implementReason
  });

  current = await executeAndCollectTransition(scenarioContext, {
    task: current.task,
    to: "REVIEW",
    reason: reasons.reviewReason
  });

  current = await executeAndCollectTransition(scenarioContext, {
    task: current.task,
    to: "APPROVAL",
    reason: reasons.approvalReason
  });

  current = await executeAndCollectTransition(scenarioContext, {
    task: current.task,
    to: "PUBLISH_SIGNAL",
    approvalRef: buildSignalPublishApprovalReference(args),
    additionalArtifacts: ["publishable-signal-bundle"],
    reason: reasons.publishReason
  });

  current = await executeAndCollectTransition(scenarioContext, {
    task: current.task,
    to: "DONE",
    reason: reasons.doneReason
  });

  return {
    task: current.task,
    output: lastDefinedOutput(scenarioContext.results),
    approvals: scenarioContext.approvals.listApprovals(),
    approvalEvidenceByTransitionChecksum: scenarioContext.approvalEvidenceByTransitionChecksum,
    patchPlans: scenarioContext.patchPlans,
    artifacts: scenarioContext.registry.listArtifacts(),
    transitions: scenarioContext.transitions
  };
}

async function runMockMissingApprovalScenario(
  scenarioContext: ScenarioExecutionContext,
  initialTask: TaskEnvelope,
  args: CliArgs
): Promise<{
  task: TaskEnvelope;
  output?: AgentOutputEnvelope;
  approvals: WorkflowApproval[];
  approvalEvidenceByTransitionChecksum: Record<string, ApprovalTransitionEvidence>;
  patchPlans: PatchPlanEvidence[];
  artifacts: WorkflowArtifact[];
  transitions: TransitionRecord[];
  blockedTransition: BlockedTransitionInfo;
}> {
  const designResult = await executeAndCollectTransition(scenarioContext, {
    task: initialTask,
    to: "DESIGN",
    reason: "Mock Product handoff"
  });

  let blockedTransition: BlockedTransitionInfo | undefined;
  try {
    await executeAndCollectTransition(scenarioContext, {
      task: designResult.task,
      to: "FORMALIZE",
      reason: "Probe missing architecture approval"
    });
    throw new Error("Expected missing-approval transition to fail");
  } catch (error) {
    if (!(error instanceof WorkflowTransitionError) && !(error instanceof ApprovalValidationError)) {
      throw error;
    }

    blockedTransition = {
      from: "DESIGN",
      to: "FORMALIZE",
      error: error.message,
      timestampUtc: new Date().toISOString()
    };
  }

  const rejectedResult = await executeAndCollectTransition(scenarioContext, {
    task: designResult.task,
    to: "REJECTED",
    reason: `MISSING_APPROVAL: ${blockedTransition?.error ?? "DESIGN -> FORMALIZE approval missing"}`
  });

  return {
    task: rejectedResult.task,
    output: lastDefinedOutput(scenarioContext.results),
    approvals: scenarioContext.approvals.listApprovals(),
    approvalEvidenceByTransitionChecksum: scenarioContext.approvalEvidenceByTransitionChecksum,
    patchPlans: scenarioContext.patchPlans,
    artifacts: scenarioContext.registry.listArtifacts(),
    transitions: scenarioContext.transitions,
    blockedTransition: blockedTransition ?? {
      from: "DESIGN",
      to: "FORMALIZE",
      error: "Missing approval",
      timestampUtc: new Date().toISOString()
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

type ScenarioExecutionContext = {
  scenario: MockScenario;
  orchestrator: OrchestratorCore;
  snapshot: RuntimeConfigSnapshot;
  registry: ArtifactRegistry;
  approvals: ApprovalRegistry;
  approvalEvidenceByTransitionChecksum: Record<string, ApprovalTransitionEvidence>;
  patchPlans: PatchPlanEvidence[];
  transitions: TransitionRecord[];
  results: TransitionResult[];
};

async function executeAndCollectTransition(
  context: ScenarioExecutionContext,
  input: {
    task: TaskEnvelope;
    to: string;
    approvalRef?: ApprovalReference;
    additionalArtifacts?: string[];
    reason: string;
  }
): Promise<TransitionResult> {
  const nowUtc = new Date().toISOString();
  const approvalValidation = context.approvals.validateForTransition({
    taskId: input.task.taskId,
    from: input.task.workflowState,
    to: input.to,
    approvalRef: input.approvalRef,
    nowUtc
  });

  const result = await context.orchestrator.transition({
    task: input.task,
    to: input.to,
    ...(input.approvalRef ? { approvalRef: input.approvalRef } : {}),
    ...(input.additionalArtifacts ? { additionalArtifacts: input.additionalArtifacts } : {}),
    nowUtc,
    reason: input.reason
  });

  const artifactValidation = validateTransitionArtifacts({
    snapshot: context.snapshot,
    registry: context.registry,
    transitionResult: result,
    additionalArtifactTypes: input.additionalArtifacts
  });

  const normalizedTransition: TransitionRecord = {
    ...result.transition,
    artifactRefs: artifactValidation.transitionArtifactRefs
  };

  Object.assign(
    context.approvalEvidenceByTransitionChecksum,
    approvalEvidenceByTransitionChecksum(result, approvalValidation.evidence)
  );

  const patchPlan = extractPatchPlanEvidenceFromBackendOutput({
    output: result.output,
    transitionChecksum: result.transition.transitionChecksum,
    fromState: result.transition.from,
    toState: result.transition.to,
    scenario: context.scenario
  });
  if (patchPlan) {
    context.patchPlans.push(patchPlan);
  }

  context.results.push(result);
  context.transitions.push(normalizedTransition);
  return result;
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
