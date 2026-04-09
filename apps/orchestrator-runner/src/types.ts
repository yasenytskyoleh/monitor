import type { EnvironmentName } from "@monitor/agent-config";
import type { AgentOutputEnvelope, TransitionRecord } from "@monitor/orchestrator-core";
import type { WorkflowArtifact } from "./artifacts/types.js";
import type { RunOutcome } from "./persistence/types.js";

export type RunnerMode = "live" | "mock";
export type OutputFormat = "text" | "json";
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
  artifacts: WorkflowArtifact[];
  transitions: TransitionRecord[];
  scenarios?: MockScenarioResult[];
};

export type CliArgs = {
  rootDir?: string;
  mode: RunnerMode;
  output: OutputFormat;
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
