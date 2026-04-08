import type { AGENT_ROLES, APPROVAL_TYPES, PERMISSION_ACTIONS, SUPPORTED_ENVIRONMENTS } from "./constants.js";

export type EnvironmentName = (typeof SUPPORTED_ENVIRONMENTS)[number];
export type AgentRole = (typeof AGENT_ROLES)[number];
export type ApprovalType = (typeof APPROVAL_TYPES)[number];
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type RuntimeConcurrency = {
  maxParallelTasks: number;
  maxParallelActionsPerTask: number;
};

export type RuntimeRetryPolicy = {
  retries: number;
  backoffMs: number;
  retryOn: string[];
};

export type RuntimeDefaults = {
  jsonModeRequired: boolean;
  provider: "openai";
  model: string;
  fallbackModel?: string;
  temperature: number;
  maxTokens: number;
  maxArtifactsPerOutput: number;
  retryPolicy: RuntimeRetryPolicy;
  timeoutMs: number;
  concurrency: RuntimeConcurrency;
};

export type RuntimeDefaultsOverride = {
  jsonModeRequired?: boolean;
  provider?: "openai";
  model?: string;
  fallbackModel?: string;
  temperature?: number;
  maxTokens?: number;
  maxArtifactsPerOutput?: number;
  retryPolicy?: Partial<RuntimeRetryPolicy>;
  timeoutMs?: number;
  concurrency?: Partial<RuntimeConcurrency>;
};

export type ApprovalPolicy = {
  allowMockApprovals: boolean;
};

export type RuntimeDefaultsFile = {
  version: number;
  schemaVersion: number;
  runtime: {
    jsonModeRequired?: boolean;
    defaultProvider: "openai";
    defaultModel: string;
    fallbackModel?: string;
    temperature: number;
    maxTokens: number;
    maxArtifactsPerOutput?: number;
    retryPolicy: {
      maxRetries: number;
      backoffMs?: number;
      retryOn?: string[];
    };
    timeoutMs: number;
    concurrency?: {
      maxParallelTasks: number;
      maxParallelActionsPerTask: number;
    };
  };
};

export type RuntimeOverridesFile = {
  jsonModeRequired?: boolean;
  defaultProvider?: "openai";
  defaultModel?: string;
  fallbackModel?: string;
  temperature?: number;
  maxTokens?: number;
  maxArtifactsPerOutput?: number;
  timeoutMs?: number;
  retryPolicy?: {
    maxRetries?: number;
    backoffMs?: number;
    retryOn?: string[];
  };
  concurrency?: {
    maxParallelTasks?: number;
    maxParallelActionsPerTask?: number;
  };
};

export type PermissionAllowlistRaw = {
  allowedActions: string[];
};

export type PermissionAllowlist = {
  allow: string[];
};

export type PromptReferenceRaw = {
  version: string;
  file: string;
};

export type PromptReference = {
  version: string;
  template: string;
};

export type PromptReferenceOverride = Partial<PromptReference>;

export type RawAgentConfig = {
  id: string;
  role: AgentRole;
  ownsStates: string[];
  allowedInputs: string[];
  requiredOutputs: string[];
  allowedNextActions: string[];
  permissions: PermissionAllowlistRaw;
  requiredArtifacts: string[];
  outputContract: {
    schemaRef: string;
  };
  escalation: {
    allowed: boolean;
    severities: string[];
  };
  prompt: PromptReferenceRaw;
};

export type AgentConfig = {
  id: string;
  role: AgentRole;
  ownsStates: string[];
  allowedInputs: string[];
  requiredOutputs: string[];
  allowedNextActions: string[];
  permissions: PermissionAllowlist;
  requiredArtifacts: string[];
  outputContractSchemaRef: string;
  escalationPolicy: {
    allowed: boolean;
    severities: string[];
  };
  prompt: PromptReference;
  runtimeOverrides?: RuntimeDefaultsOverride;
};

export type AgentConfigFile = {
  version: number;
  schemaVersion: number;
  agents: RawAgentConfig[];
};

export type WorkflowTransition = {
  from: string;
  to: string;
  requiresApproval?: boolean;
  approvalType?: ApprovalType;
};

export type WorkflowApprovalRule = {
  transition: {
    from: string;
    to: string;
  };
  type: ApprovalType;
  required: boolean;
  expiresInMinutes?: number;
};

export type WorkflowFile = {
  version: number;
  schemaVersion: number;
  workflow: {
    states: string[];
    initialState: string;
    terminalStates: string[];
    stateOwners: Record<string, string>;
    transitions: Array<{
      from: string;
      to: string;
    }>;
    approvalRules?: WorkflowApprovalRule[];
    requiredArtifactsByState?: Record<string, string[]>;
    rejectionRules?: {
      allowRejectFromAnyState?: boolean;
      rejectionCodes?: string[];
    };
    reentryRules?: Record<
      string,
      {
        invalidatesApproval: boolean;
        requiresNewReview: boolean;
      }
    >;
  };
};

export type WorkflowGraphConfig = {
  states: string[];
  initialState: string;
  terminalStates: string[];
  transitions: WorkflowTransition[];
  stateOwners: Record<string, string>;
  requiredArtifactsByState?: Record<string, string[]>;
  rejectionRules?: {
    allowRejectFromAnyState?: boolean;
    rejectionCodes?: string[];
  };
  reentryRules?: Record<
    string,
    {
      invalidatesApproval: boolean;
      requiresNewReview: boolean;
    }
  >;
};

export type EnvironmentOverlayConfig = {
  version: number;
  schemaVersion: number;
  environment: string;
  overrides?: {
    runtime?: RuntimeOverridesFile;
    approvals?: {
      allowMockApprovals?: boolean;
    };
  };
};

export type BaseConfig = {
  runtimeDefaults: RuntimeDefaults;
  approvalPolicy: ApprovalPolicy;
  agents: AgentConfig[];
  workflow: WorkflowGraphConfig;
};

export type MergedConfig = BaseConfig;

export type ResolvedAgentConfig = Omit<AgentConfig, "runtimeOverrides"> & {
  runtime: RuntimeDefaults;
};

export type RuntimeConfigSnapshot = {
  version: string;
  environment: string;
  compiledAt: string;
  checksum: string;
  runtimeDefaults: RuntimeDefaults;
  approvalPolicy: ApprovalPolicy;
  promptSetVersion: string;
  promptSetChecksum: string;
  workflow: WorkflowGraphConfig;
  agents: ResolvedAgentConfig[];
};

export type ConfigVersionRecord = {
  releaseId: string;
  environment: string;
  configVersion: string;
  promptSetVersion: string;
  schemaVersion: number;
  createdBy: string;
  createdAt?: string;
  notes?: string;
  checksum?: string;
  snapshotPath?: string;
};

export type ActivationHistoryEntry = {
  environment: string;
  configVersion: string;
  activatedAt: string;
  activatedBy: string;
};

export type PromptManifestEntry = {
  file: string;
  sha256: string;
  version: string;
};

export type VersionManifest = {
  version: number;
  schemaVersion: number;
  active: {
    configVersion: string;
    promptSetVersion: string;
    schemaVersion: number;
  };
  records: ConfigVersionRecord[];
  prompts: {
    version: string;
    entries: PromptManifestEntry[];
  };
  history?: ActivationHistoryEntry[];
};

export type CompileRuntimeConfigOptions = {
  rootDir: string;
  environment: string;
  version?: string;
  envVars?: Record<string, string | undefined>;
};

export type ValidateReleaseOptions = {
  environment: string;
  version?: string;
  envVars?: Record<string, string | undefined>;
};

export type CompileSnapshotOptions = {
  environment: string;
  version?: string;
  outputPath?: string;
  overwrite?: boolean;
  envVars?: Record<string, string | undefined>;
};

export type CompileSnapshotResult = {
  environment: string;
  version: string;
  checksum: string;
  snapshotPath: string;
};

export type PublishReleaseOptions = {
  version: string;
  createdBy: string;
  envVars?: Record<string, string | undefined>;
  environments?: string[];
};

export type ActivateReleaseOptions = {
  environment: string;
  version: string;
  activatedBy: string;
};

export type RollbackReleaseOptions = {
  environment: string;
  activatedBy: string;
};

export type ApprovalStatus = "approved" | "rejected" | "revoked" | "expired" | "pending";

export type ApprovalReference = {
  approvalId: string;
  approvalType: ApprovalType;
  approvedBy: string;
  approvedAtUtc: string;
  status: ApprovalStatus;
  expiresAtUtc?: string;
  revokedAtUtc?: string;
  revokedBy?: string;
};

export type TransitionRequest = {
  from: string;
  to: string;
  approvalRef?: ApprovalReference;
  nowUtc?: string;
};
