import { createHash } from "node:crypto";
import { join } from "node:path";

import { CONFIG_PATHS } from "./constants.js";
import { ConfigValidationError } from "./errors.js";
import { fileExists, readTextFile, readYamlFile } from "./io.js";
import { applyEnvironmentVariableOverrides, mergeConfig, resolveAgentRuntime } from "./merge.js";
import { getSchemaValidator } from "./schema-validator.js";
import { validateSemantics } from "./semantic-validator.js";
import type {
  AgentConfig,
  AgentConfigFile,
  BaseConfig,
  CompileRuntimeConfigOptions,
  EnvironmentOverlayConfig,
  PromptManifestEntry,
  RuntimeConfigSnapshot,
  RuntimeDefaults,
  RuntimeDefaultsFile,
  VersionManifest,
  WorkflowFile,
  WorkflowGraphConfig,
  WorkflowTransition
} from "./types.js";
import { createChecksum, deepFreeze, transitionKey } from "./utils.js";

const SCHEMA_IDS = {
  runtimeDefaultsFile: "https://monitor/schemas/runtime-defaults.schema.json",
  agentsFile: "https://monitor/schemas/agents-file.schema.json",
  workflowFile: "https://monitor/schemas/workflow-graph.schema.json",
  envOverlay: "https://monitor/schemas/env-overlay.schema.json",
  versionManifest: "https://monitor/schemas/version-manifest.schema.json"
} as const;

export async function compileRuntimeConfig(options: CompileRuntimeConfigOptions): Promise<RuntimeConfigSnapshot> {
  const envVars = options.envVars ?? process.env;
  const validator = getSchemaValidator();

  const runtimeDefaultsPath = join(options.rootDir, CONFIG_PATHS.runtimeDefaults);
  const agentsPath = join(options.rootDir, CONFIG_PATHS.agents);
  const workflowPath = join(options.rootDir, CONFIG_PATHS.workflow);
  const envOverlayPath = join(options.rootDir, CONFIG_PATHS.envDir, `${options.environment}.yaml`);
  const manifestPath = join(options.rootDir, CONFIG_PATHS.manifest);

  if (!(await fileExists(envOverlayPath))) {
    throw new ConfigValidationError(`Missing environment overlay file: ${envOverlayPath}`);
  }
  if (!(await fileExists(manifestPath))) {
    throw new ConfigValidationError(`Missing version manifest file: ${manifestPath}`);
  }

  const runtimeDefaultsFile = await readYamlFile<RuntimeDefaultsFile>(runtimeDefaultsPath);
  const agentsFile = await readYamlFile<AgentConfigFile>(agentsPath);
  const workflowFile = await readYamlFile<WorkflowFile>(workflowPath);
  const envOverlay = await readYamlFile<EnvironmentOverlayConfig>(envOverlayPath);
  const versionManifest = await readYamlFile<VersionManifest>(manifestPath);

  await validator.validateOrThrow(SCHEMA_IDS.runtimeDefaultsFile, runtimeDefaultsFile, "base runtime defaults");
  await validator.validateOrThrow(SCHEMA_IDS.agentsFile, agentsFile, "base agents config");
  await validator.validateOrThrow(SCHEMA_IDS.workflowFile, workflowFile, "base workflow config");
  await validator.validateOrThrow(SCHEMA_IDS.envOverlay, envOverlay, `${options.environment} env overlay`);
  await validator.validateOrThrow(SCHEMA_IDS.versionManifest, versionManifest, "version manifest");

  if (envOverlay.environment !== options.environment) {
    throw new ConfigValidationError(
      `Environment overlay mismatch: expected '${options.environment}', got '${envOverlay.environment}'`
    );
  }

  validateManifestActiveRecord(versionManifest, options.environment);

  const baseConfig: BaseConfig = {
    runtimeDefaults: normalizeRuntimeDefaults(runtimeDefaultsFile),
    approvalPolicy: {
      allowMockApprovals: false
    },
    agents: normalizeAgents(agentsFile),
    workflow: normalizeWorkflow(workflowFile)
  };

  const mergedConfig = mergeConfig(baseConfig, envOverlay);
  const runtimeDefaultsWithEnv = applyEnvironmentVariableOverrides(mergedConfig.runtimeDefaults, envVars);
  const promptSet = await validatePromptSet({
    rootDir: options.rootDir,
    promptsRootDir: join(options.rootDir, CONFIG_PATHS.promptsDir),
    manifest: versionManifest,
    agents: mergedConfig.agents
  });

  validateRuntimeDefaults(runtimeDefaultsWithEnv);

  await validateSemantics({
    config: {
      runtimeDefaults: runtimeDefaultsWithEnv,
      approvalPolicy: mergedConfig.approvalPolicy,
      agents: mergedConfig.agents,
      workflow: mergedConfig.workflow
    },
    promptsRootDir: join(options.rootDir, CONFIG_PATHS.promptsDir)
  });

  const resolvedAgents = resolveAgentRuntime(runtimeDefaultsWithEnv, mergedConfig.agents);
  const version = options.version ?? "draft";
  const compiledAt = new Date().toISOString();

  const snapshotWithoutChecksum = {
    version,
    environment: options.environment,
    compiledAt,
    runtimeDefaults: runtimeDefaultsWithEnv,
    approvalPolicy: mergedConfig.approvalPolicy,
    promptSetVersion: promptSet.version,
    promptSetChecksum: promptSet.checksum,
    workflow: mergedConfig.workflow,
    agents: resolvedAgents
  };

  const snapshot: RuntimeConfigSnapshot = {
    ...snapshotWithoutChecksum,
    checksum: createChecksum(snapshotWithoutChecksum)
  };

  return deepFreeze(snapshot);
}

function normalizeRuntimeDefaults(runtimeFile: RuntimeDefaultsFile): RuntimeDefaults {
  return {
    jsonModeRequired: runtimeFile.runtime.jsonModeRequired ?? true,
    provider: runtimeFile.runtime.defaultProvider,
    model: runtimeFile.runtime.defaultModel,
    fallbackModel: runtimeFile.runtime.fallbackModel,
    temperature: runtimeFile.runtime.temperature,
    maxTokens: runtimeFile.runtime.maxTokens,
    maxArtifactsPerOutput: runtimeFile.runtime.maxArtifactsPerOutput ?? 10,
    retryPolicy: {
      retries: runtimeFile.runtime.retryPolicy.maxRetries,
      backoffMs: runtimeFile.runtime.retryPolicy.backoffMs ?? 1000,
      retryOn: runtimeFile.runtime.retryPolicy.retryOn
        ? [...runtimeFile.runtime.retryPolicy.retryOn]
        : ["timeout", "rate_limit", "transient_error"]
    },
    timeoutMs: runtimeFile.runtime.timeoutMs,
    concurrency: runtimeFile.runtime.concurrency
      ? {
          maxParallelTasks: runtimeFile.runtime.concurrency.maxParallelTasks,
          maxParallelActionsPerTask: runtimeFile.runtime.concurrency.maxParallelActionsPerTask
        }
      : {
          maxParallelTasks: 1,
          maxParallelActionsPerTask: 1
        }
  };
}

function normalizeAgents(agentsFile: AgentConfigFile): AgentConfig[] {
  return agentsFile.agents.map((agent) => ({
    id: agent.id,
    role: agent.role,
    ownsStates: [...agent.ownsStates],
    allowedInputs: [...agent.allowedInputs],
    requiredOutputs: [...agent.requiredOutputs],
    allowedNextActions: [...agent.allowedNextActions],
    permissions: {
      allow: [...agent.permissions.allowedActions]
    },
    requiredArtifacts: [...agent.requiredArtifacts],
    outputContractSchemaRef: agent.outputContract.schemaRef,
    escalationPolicy: {
      allowed: agent.escalation.allowed,
      severities: [...agent.escalation.severities]
    },
    prompt: {
      version: agent.prompt.version,
      template: agent.prompt.file
    }
  }));
}

function normalizeWorkflow(workflowFile: WorkflowFile): WorkflowGraphConfig {
  const workflow = workflowFile.workflow;
  const declaredTransitions = new Set<string>(
    workflow.transitions.map((transition) => transitionKey(transition.from, transition.to))
  );
  const approvalTypeByTransition = new Map<string, WorkflowTransition["approvalType"]>();

  for (const approvalRule of workflow.approvalRules ?? []) {
    if (!approvalRule.required) {
      continue;
    }

    const key = transitionKey(approvalRule.transition.from, approvalRule.transition.to);
    if (!declaredTransitions.has(key)) {
      throw new ConfigValidationError(
        `Approval rule references undefined transition: ${approvalRule.transition.from} -> ${approvalRule.transition.to}`
      );
    }

    approvalTypeByTransition.set(
      key,
      approvalRule.type
    );
  }

  const transitions = new Map<string, WorkflowTransition>();

  for (const transition of workflow.transitions) {
    const key = transitionKey(transition.from, transition.to);
    const approvalType = approvalTypeByTransition.get(key);

    transitions.set(key, {
      from: transition.from,
      to: transition.to,
      requiresApproval: approvalType !== undefined,
      approvalType
    });
  }

  if (workflow.rejectionRules?.allowRejectFromAnyState) {
    const terminalStates = new Set(workflow.terminalStates);

    for (const state of workflow.states) {
      if (state === "REJECTED" || terminalStates.has(state)) {
        continue;
      }

      const rejectionKey = transitionKey(state, "REJECTED");
      if (!transitions.has(rejectionKey)) {
        transitions.set(rejectionKey, {
          from: state,
          to: "REJECTED"
        });
      }
    }
  }

  return {
    states: [...workflow.states],
    initialState: workflow.initialState,
    terminalStates: [...workflow.terminalStates],
    transitions: [...transitions.values()],
    stateOwners: Object.fromEntries(Object.entries(workflow.stateOwners)),
    requiredArtifactsByState: workflow.requiredArtifactsByState
      ? Object.fromEntries(
          Object.entries(workflow.requiredArtifactsByState).map(([state, artifacts]) => [state, [...artifacts]])
        )
      : undefined,
    rejectionRules: workflow.rejectionRules
      ? {
          allowRejectFromAnyState: workflow.rejectionRules.allowRejectFromAnyState,
          rejectionCodes: workflow.rejectionRules.rejectionCodes
            ? [...workflow.rejectionRules.rejectionCodes]
            : undefined
        }
      : undefined,
    reentryRules: workflow.reentryRules
      ? Object.fromEntries(
          Object.entries(workflow.reentryRules).map(([name, value]) => [
            name,
            {
              invalidatesApproval: value.invalidatesApproval,
              requiresNewReview: value.requiresNewReview
            }
          ])
        )
      : undefined
  };
}

function validateRuntimeDefaults(runtimeDefaults: RuntimeDefaults): void {
  const errors: string[] = [];

  if (runtimeDefaults.provider !== "openai") {
    errors.push(`Unsupported provider: ${runtimeDefaults.provider}`);
  }

  if (!runtimeDefaults.model.trim()) {
    errors.push("Runtime model cannot be empty");
  }

  if (runtimeDefaults.fallbackModel !== undefined && !runtimeDefaults.fallbackModel.trim()) {
    errors.push("Runtime fallbackModel cannot be empty when provided");
  }

  if (runtimeDefaults.temperature < 0 || runtimeDefaults.temperature > 2) {
    errors.push(`Runtime temperature must be between 0 and 2, received: ${runtimeDefaults.temperature}`);
  }

  if (!Number.isInteger(runtimeDefaults.maxTokens) || runtimeDefaults.maxTokens < 1) {
    errors.push(`Runtime maxTokens must be a positive integer, received: ${runtimeDefaults.maxTokens}`);
  }

  if (!Number.isInteger(runtimeDefaults.maxArtifactsPerOutput) || runtimeDefaults.maxArtifactsPerOutput < 1) {
    errors.push(
      `Runtime maxArtifactsPerOutput must be a positive integer, received: ${runtimeDefaults.maxArtifactsPerOutput}`
    );
  }

  if (
    !Number.isInteger(runtimeDefaults.retryPolicy.retries) ||
    runtimeDefaults.retryPolicy.retries < 0 ||
    runtimeDefaults.retryPolicy.retries > 10
  ) {
    errors.push(
      `Runtime retryPolicy.retries must be an integer in range 0..10, received: ${runtimeDefaults.retryPolicy.retries}`
    );
  }

  if (!Number.isInteger(runtimeDefaults.retryPolicy.backoffMs) || runtimeDefaults.retryPolicy.backoffMs < 0) {
    errors.push(
      `Runtime retryPolicy.backoffMs must be an integer >= 0, received: ${runtimeDefaults.retryPolicy.backoffMs}`
    );
  }

  if (!Array.isArray(runtimeDefaults.retryPolicy.retryOn) || runtimeDefaults.retryPolicy.retryOn.length === 0) {
    errors.push("Runtime retryPolicy.retryOn must include at least one reason");
  } else if (runtimeDefaults.retryPolicy.retryOn.some((reason) => !reason.trim())) {
    errors.push("Runtime retryPolicy.retryOn cannot contain empty reasons");
  } else if (new Set(runtimeDefaults.retryPolicy.retryOn).size !== runtimeDefaults.retryPolicy.retryOn.length) {
    errors.push("Runtime retryPolicy.retryOn cannot contain duplicate reasons");
  }

  if (!Number.isInteger(runtimeDefaults.timeoutMs) || runtimeDefaults.timeoutMs < 1000) {
    errors.push(`Runtime timeoutMs must be >= 1000, received: ${runtimeDefaults.timeoutMs}`);
  }

  if (!Number.isInteger(runtimeDefaults.concurrency.maxParallelTasks) || runtimeDefaults.concurrency.maxParallelTasks < 1) {
    errors.push(
      `Runtime concurrency.maxParallelTasks must be a positive integer, received: ${runtimeDefaults.concurrency.maxParallelTasks}`
    );
  }

  if (
    !Number.isInteger(runtimeDefaults.concurrency.maxParallelActionsPerTask) ||
    runtimeDefaults.concurrency.maxParallelActionsPerTask < 1
  ) {
    errors.push(
      "Runtime concurrency.maxParallelActionsPerTask must be a positive integer, received: " +
        runtimeDefaults.concurrency.maxParallelActionsPerTask
    );
  }

  if (errors.length > 0) {
    throw new ConfigValidationError("Runtime defaults validation failed", errors);
  }
}

type ValidatePromptSetOptions = {
  rootDir: string;
  promptsRootDir: string;
  manifest: VersionManifest;
  agents: AgentConfig[];
};

type ValidatedPromptSet = {
  version: string;
  checksum: string;
};

async function validatePromptSet(options: ValidatePromptSetOptions): Promise<ValidatedPromptSet> {
  const errors: string[] = [];
  const activePromptSetVersion = options.manifest.active.promptSetVersion;
  const promptSectionVersion = options.manifest.prompts.version;

  if (promptSectionVersion !== activePromptSetVersion) {
    errors.push(
      `Manifest prompt version mismatch: active.promptSetVersion='${activePromptSetVersion}' vs prompts.version='${promptSectionVersion}'`
    );
  }

  const allEntries = options.manifest.prompts.entries;
  const promptEntries = allEntries.filter((entry) => entry.version === activePromptSetVersion);

  if (promptEntries.length === 0) {
    errors.push(`No prompt entries found for active prompt set version '${activePromptSetVersion}'`);
  }

  const entryByFile = new Map<string, PromptManifestEntry>();
  for (const entry of promptEntries) {
    if (entryByFile.has(entry.file)) {
      errors.push(`Duplicate prompt manifest entry for file '${entry.file}' and version '${entry.version}'`);
      continue;
    }
    entryByFile.set(entry.file, entry);
  }

  for (const entry of promptEntries) {
    const promptPath = join(options.promptsRootDir, activePromptSetVersion, entry.file);
    if (!(await fileExists(promptPath))) {
      errors.push(`Prompt file from manifest is missing: ${promptPath}`);
      continue;
    }

    const promptBody = await readTextFile(promptPath);
    const checksum = createHash("sha256").update(promptBody).digest("hex");
    if (checksum !== entry.sha256) {
      errors.push(
        `Prompt checksum mismatch for '${entry.file}': expected '${entry.sha256}', got '${checksum}'`
      );
    }
  }

  for (const agent of options.agents) {
    if (agent.prompt.version !== activePromptSetVersion) {
      errors.push(
        `Agent '${agent.id}' uses prompt version '${agent.prompt.version}', but active prompt set is '${activePromptSetVersion}'`
      );
      continue;
    }

    if (!entryByFile.has(agent.prompt.template)) {
      errors.push(
        `Agent '${agent.id}' references prompt '${agent.prompt.template}' not found in manifest for version '${activePromptSetVersion}'`
      );
    }
  }

  if (errors.length > 0) {
    throw new ConfigValidationError("Prompt manifest validation failed", errors);
  }

  return {
    version: activePromptSetVersion,
    checksum: createChecksum(
      promptEntries.map((entry) => ({
        file: entry.file,
        version: entry.version,
        sha256: entry.sha256
      }))
    )
  };
}

function validateManifestActiveRecord(manifest: VersionManifest, environment: string): void {
  const activeRecord = manifest.records.find(
    (record) => record.environment === environment && record.configVersion === manifest.active.configVersion
  );

  if (!activeRecord) {
    throw new ConfigValidationError(
      `Active config version '${manifest.active.configVersion}' has no published record for environment '${environment}'`
    );
  }

  const errors: string[] = [];

  if (activeRecord.promptSetVersion !== manifest.active.promptSetVersion) {
    errors.push(
      `Active record promptSetVersion '${activeRecord.promptSetVersion}' does not match active prompt set '${manifest.active.promptSetVersion}'`
    );
  }

  if (activeRecord.schemaVersion !== manifest.active.schemaVersion) {
    errors.push(
      `Active record schemaVersion '${activeRecord.schemaVersion}' does not match active schema version '${manifest.active.schemaVersion}'`
    );
  }

  if (errors.length > 0) {
    throw new ConfigValidationError("Version manifest active record validation failed", errors);
  }
}
