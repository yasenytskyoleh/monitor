export type BackendVerificationMode =
  | "none"
  | "lint"
  | "lint+typecheck"
  | "lint+typecheck+test";

export type BackendVerificationHookName = "lint" | "typecheck" | "test";

export type BackendVerificationHook = {
  name: BackendVerificationHookName;
  command: string[];
  timeoutMs: number;
};

export type BackendVerificationHookStatus = "passed" | "failed" | "timed_out" | "skipped";

export type BackendVerificationHookResult = {
  name: BackendVerificationHookName;
  status: BackendVerificationHookStatus;
  command: string;
  exitCode: number | null;
  durationMs: number;
  stdoutSummary?: string;
  stderrSummary?: string;
};

export type BackendVerificationOverallStatus = "passed" | "failed" | "skipped";

export type BackendVerificationResult = {
  applied: boolean;
  hooksRequested: BackendVerificationHookName[];
  hooksExecuted: BackendVerificationHookResult[];
  overallStatus: BackendVerificationOverallStatus;
};

export type VerificationResultEvidence = BackendVerificationResult & {
  taskId: string;
  scenario?: string;
  transitionChecksum?: string;
  fromState?: string;
  toState?: string;
};

export type BackendVerificationCommandResult = {
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export type BackendVerificationCommandRunner = (input: {
  command: string[];
  cwd: string;
  timeoutMs: number;
}) => Promise<BackendVerificationCommandResult>;
