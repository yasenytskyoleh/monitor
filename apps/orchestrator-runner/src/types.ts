import type { EnvironmentName } from "@monitor/agent-config";
import type { AgentOutputEnvelope, TransitionRecord } from "@monitor/orchestrator-core";
import type { RunOutcome } from "./persistence/types.js";

export type RunnerMode = "live" | "mock";
export type TargetState = "DESIGN" | "FORMALIZE";
export type MockScenario = "happy" | "missing-approval";
export type MockScenarioSelection = MockScenario | "both";

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
