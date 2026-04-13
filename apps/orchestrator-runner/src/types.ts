import type { EnvironmentName } from "@monitor/agent-config";
import type { AgentOutputEnvelope, TransitionRecord } from "@monitor/orchestrator-core";
import type { ApprovalTransitionEvidence, WorkflowApproval } from "./approvals/types.js";
import type { WorkflowArtifact } from "./artifacts/types.js";
import type { PatchPlanEvidence, PatchResultEvidence } from "./backend-patch/types.js";
import type { WorkspaceSummaryEvidence } from "./backend-isolation/types.js";
import type {
  BackendRollbackMode,
  RollbackPlanEvidence,
  RollbackResultEvidence
} from "./backend-rollback/types.js";
import type { VerificationResultEvidence } from "./backend-verification/types.js";
import type { RunOutcome } from "./persistence/types.js";

export type RunnerMode = "live" | "mock";
export type OutputFormat = "text" | "json";
export type BackendWriteMode = "dry-run" | "apply";
export type MockScenario = "happy" | "missing-approval";
export type MockScenarioSelection = MockScenario | "both";
export type ExecutionMode = "mock" | "live";

export type AgentExecutionMap = Record<
  | "product-agent"
  | "architect-agent"
  | "quant-pattern-agent"
  | "backend-agent"
  | "docs-reviewer-agent",
  ExecutionMode
>;

export type BlockedTransitionInfo = {
  from: string;
  to: string;
  error: string;
  timestampUtc: string;
};

export type MockScenarioResult = {
  scenario: MockScenario;
  status: "ok";
  finalState: string;
  output?: AgentOutputEnvelope;
  approvals: WorkflowApproval[];
  approvalEvidenceByTransitionChecksum: Record<string, ApprovalTransitionEvidence>;
  patchPlans: PatchPlanEvidence[];
  patchResults: PatchResultEvidence[];
  workspaceSummaries: WorkspaceSummaryEvidence[];
  rollbackPlans: RollbackPlanEvidence[];
  rollbackResults: RollbackResultEvidence[];
  verificationResults: VerificationResultEvidence[];
  artifacts: WorkflowArtifact[];
  transitions: TransitionRecord[];
  transitionLogPath: string;
  blockedTransition?: BlockedTransitionInfo;
};

export type RunnerOutput = {
  status: "ok";
  runId?: string;
  artifactsPath?: string;
  outcome?: RunOutcome;
  reason?: string;
  agentModes?: AgentExecutionMap;
  snapshot: Record<string, unknown>;
  transitionLogPath: string;
  taskState: string;
  output?: AgentOutputEnvelope;
  approvals: WorkflowApproval[];
  approvalEvidenceByTransitionChecksum: Record<string, ApprovalTransitionEvidence>;
  patchPlans: PatchPlanEvidence[];
  patchResults: PatchResultEvidence[];
  workspaceSummaries: WorkspaceSummaryEvidence[];
  rollbackPlans: RollbackPlanEvidence[];
  rollbackResults: RollbackResultEvidence[];
  verificationResults: VerificationResultEvidence[];
  artifacts: WorkflowArtifact[];
  transitions: TransitionRecord[];
  scenarios?: MockScenarioResult[];
};

export type CliArgs = {
  rootDir?: string;
  mode: RunnerMode;
  output: OutputFormat;
  backendWrite: BackendWriteMode;
  backendRollbackMode: BackendRollbackMode;
  backendVerificationMode: "none" | "lint" | "lint+typecheck" | "lint+typecheck+test";
  agentModeOverrides: Partial<AgentExecutionMap>;
  scenario?: MockScenarioSelection;
  environment: EnvironmentName;
  version?: string;
  taskId: string;
  requestedBy: string;
  taskTitle: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  inputFile?: string;
  inputJson?: string;
  logPath?: string;
  approvalId?: string;
  approvalBy?: string;
  approvalAtUtc?: string;
  approvalExpiresAtUtc?: string;
};
