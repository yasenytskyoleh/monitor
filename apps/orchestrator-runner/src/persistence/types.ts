import type { ApprovalReference } from "@monitor/agent-config";
import type { ApprovalTransitionEvidence, WorkflowApproval } from "../approvals/types.js";
import type { AgentExecutionMap } from "../types.js";
import type { WorkflowArtifact } from "../artifacts/types.js";

export type RunOutcome = "success" | "policy_rejection" | "runtime_failure";

export type PersistedRunRecord = {
  runId: string;
  taskId: string;
  env: string;
  mode: "mock" | "live";
  agentModes: AgentExecutionMap;
  scenario?: string;
  startedAtUtc: string;
  finishedAtUtc: string;
  finalState: string;
  outcome: RunOutcome;
  configVersion: string;
  promptSetVersion: string;
  schemaVersion: number;
  snapshotChecksum: string;
};

export type PersistedTransitionRecord = {
  runId: string;
  index: number;
  from: string;
  to: string;
  requestedBy: string;
  executedBy: string;
  timestampUtc: string;
  approvalRef?: ApprovalReference;
  approvalType?: string;
  validationStatus?: ApprovalTransitionEvidence["validationStatus"];
  evidenceSummary?: string;
  reason: string;
  artifactRefs: string[];
  blocked?: boolean;
  scenario?: string;
};

export type PersistedTerminalOutcomeRecord = {
  runId: string;
  finalState: string;
  outcome: RunOutcome;
  transitionCount: number;
  artifactSummary: string[];
  reason?: string;
  rejectionCode?: string;
  blockingReferences?: Array<{
    from: string;
    to: string;
    error: string;
  }>;
};

export type PersistRunArtifactInput = {
  runId: string;
  runRecord: PersistedRunRecord;
  transitions: PersistedTransitionRecord[];
  terminalOutcome: PersistedTerminalOutcomeRecord;
  approvals: WorkflowApproval[];
  artifacts: WorkflowArtifact[];
  inputTask?: Record<string, unknown>;
  compiledSnapshotMeta?: Record<string, unknown>;
};

export type PersistRunArtifactResult = {
  runId: string;
  runDir: string;
  relativeRunDir: string;
};
