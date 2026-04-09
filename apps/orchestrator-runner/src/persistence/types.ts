import type { ApprovalReference } from "@monitor/agent-config";

export type RunOutcome = "success" | "policy_rejection" | "runtime_failure";

export type PersistedRunRecord = {
  runId: string;
  taskId: string;
  env: string;
  mode: "mock" | "live";
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
  inputTask?: Record<string, unknown>;
  compiledSnapshotMeta?: Record<string, unknown>;
};

export type PersistRunArtifactResult = {
  runId: string;
  runDir: string;
  relativeRunDir: string;
};
