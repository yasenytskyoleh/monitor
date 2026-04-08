export const SUPPORTED_ENVIRONMENTS = ["local", "dev", "staging", "prod"] as const;

export const AGENT_ROLES = [
  "PRODUCT",
  "ARCHITECT",
  "BACKEND",
  "QUANT_PATTERN",
  "DOCS_REVIEWER"
] as const;

export const APPROVAL_TYPES = ["ARCHITECTURE", "SIGNAL_PUBLISH"] as const;

export const PERMISSION_ACTIONS = [
  "docs.read",
  "docs.write",
  "backlog.read",
  "backlog.write",
  "task.metadata.write",
  "contracts.read",
  "architecture.draft",
  "patterns.write",
  "code.write",
  "tests.write",
  "migrations.notes.write",
  "changelog.write",
  "workflow.escalate",
  "workflow.transition",
  "signals.publish",
  "config.release"
] as const;

export const CONFIG_PATHS = {
  runtimeDefaults: "configs/agents/base/runtime-defaults.yaml",
  agents: "configs/agents/base/agents.yaml",
  workflow: "configs/agents/base/workflow.yaml",
  envDir: "configs/agents/env",
  promptsDir: "configs/agents/prompts",
  versionsDir: "configs/agents/versions",
  snapshotsDir: "configs/agents/versions/snapshots",
  manifest: "configs/agents/versions/manifest.yaml"
} as const;

export const ENV_VARIABLE_MAP = {
  provider: "AGENTCFG_PROVIDER",
  model: "AGENTCFG_MODEL",
  temperature: "AGENTCFG_TEMPERATURE",
  maxTokens: "AGENTCFG_MAX_TOKENS",
  retries: "AGENTCFG_RETRIES",
  timeoutMs: "AGENTCFG_TIMEOUT_MS"
} as const;
