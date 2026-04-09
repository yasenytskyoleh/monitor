import type { ApprovalReference, ResolvedAgentConfig, RuntimeConfigSnapshot } from "@monitor/agent-config";

type RuntimeAgentRole = RuntimeConfigSnapshot["agents"][number]["role"];

export type TaskEnvelope = {
  taskId: string;
  requestedBy: string;
  workflowState: string;
  input: Record<string, unknown>;
  configVersion: string;
  artifactRefs: string[];
  deadlineUtc?: string;
  constraints?: Record<string, unknown>;
  contextRefs?: string[];
  correlationId?: string;
};

export type AgentOutputStatus = "completed" | "blocked" | "needs_escalation" | "rejected";

export type AgentOutputEnvelope = {
  taskId: string;
  agentRole: RuntimeAgentRole;
  status: AgentOutputStatus;
  summary: string;
  artifacts: string[];
  nextAction:
    | "handoff_to_architect"
    | "handoff_to_quant"
    | "handoff_to_backend"
    | "handoff_to_docs_reviewer"
    | "await_approval"
    | "request_more_context"
    | "close_task"
    | "reject_task"
    | "request_architecture_clarification"
    | "return_to_implement";
  risks?: string[];
  escalation?: Record<string, unknown>;
  notes?: string | string[];
  metrics?: Record<string, unknown>;
};

export type TransitionRecord = {
  taskId: string;
  from: string;
  to: string;
  requestedBy: string;
  executedBy: string;
  timestampUtc: string;
  approvalRef?: ApprovalReference;
  reason: string;
  artifactRefs: string[];
  configVersion: string;
  configChecksum: string;
  transitionChecksum: string;
};

export type AgentHandlerContext = {
  task: TaskEnvelope;
  targetState: string;
  snapshot: RuntimeConfigSnapshot;
  agent: ResolvedAgentConfig;
};

export type AgentHandler = (context: AgentHandlerContext) => Promise<AgentOutputEnvelope> | AgentOutputEnvelope;

export type AgentHandlers = Record<string, AgentHandler>;

export type OrchestratorOptions = {
  snapshotPath: string;
  handlers?: AgentHandlers;
  transitionLogPath?: string;
  executedBy?: string;
};

export type TransitionInput = {
  task: TaskEnvelope;
  to: string;
  approvalRef?: ApprovalReference;
  requestedBy?: string;
  reason?: string;
  additionalArtifacts?: string[];
  nowUtc?: string;
};

export type TransitionResult = {
  task: TaskEnvelope;
  output?: AgentOutputEnvelope;
  transition: TransitionRecord;
};
