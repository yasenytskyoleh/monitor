import { ENV_VARIABLE_MAP } from "./constants.js";
import { ConfigValidationError } from "./errors.js";
import type {
  BaseConfig,
  EnvironmentOverlayConfig,
  MergedConfig,
  ResolvedAgentConfig,
  RuntimeDefaults,
  RuntimeDefaultsOverride,
  RuntimeOverridesFile
} from "./types.js";
import { parseFloatNumber, parseInteger } from "./utils.js";

export function mergeConfig(baseConfig: BaseConfig, overlayConfig: EnvironmentOverlayConfig): MergedConfig {
  const runtimeOverrides = toRuntimeDefaultsOverride(overlayConfig.overrides?.runtime);
  const allowMockApprovals = overlayConfig.overrides?.approvals?.allowMockApprovals;

  const mergedRuntimeDefaults: RuntimeDefaults = {
    ...baseConfig.runtimeDefaults,
    ...runtimeOverrides,
    retryPolicy: {
      ...baseConfig.runtimeDefaults.retryPolicy,
      ...(runtimeOverrides.retryPolicy ?? {})
    },
    concurrency: {
      ...baseConfig.runtimeDefaults.concurrency,
      ...(runtimeOverrides.concurrency ?? {})
    }
  };

  const mergedApprovalPolicy = {
    allowMockApprovals: allowMockApprovals ?? baseConfig.approvalPolicy.allowMockApprovals
  };

  const mergedAgents = baseConfig.agents.map((agent) => ({
    ...agent,
    ownsStates: [...agent.ownsStates],
    allowedInputs: [...agent.allowedInputs],
    requiredOutputs: [...agent.requiredOutputs],
    allowedNextActions: [...agent.allowedNextActions],
    permissions: { allow: [...agent.permissions.allow] },
    requiredArtifacts: [...agent.requiredArtifacts],
    escalationPolicy: {
      allowed: agent.escalationPolicy.allowed,
      severities: [...agent.escalationPolicy.severities]
    },
    prompt: { ...agent.prompt },
    runtimeOverrides: agent.runtimeOverrides
      ? {
          ...agent.runtimeOverrides,
          retryPolicy: agent.runtimeOverrides.retryPolicy ? { ...agent.runtimeOverrides.retryPolicy } : undefined,
          concurrency: agent.runtimeOverrides.concurrency ? { ...agent.runtimeOverrides.concurrency } : undefined
        }
      : undefined
  }));

  return {
    runtimeDefaults: mergedRuntimeDefaults,
    approvalPolicy: mergedApprovalPolicy,
    agents: mergedAgents,
    workflow: {
      ...baseConfig.workflow,
      states: [...baseConfig.workflow.states],
      terminalStates: [...baseConfig.workflow.terminalStates],
      transitions: baseConfig.workflow.transitions.map((transition) => ({ ...transition })),
      stateOwners: Object.fromEntries(Object.entries(baseConfig.workflow.stateOwners)),
      requiredArtifactsByState: baseConfig.workflow.requiredArtifactsByState
        ? Object.fromEntries(
            Object.entries(baseConfig.workflow.requiredArtifactsByState).map(([state, artifacts]) => [
              state,
              [...artifacts]
            ])
          )
        : undefined,
      rejectionRules: baseConfig.workflow.rejectionRules
        ? {
            allowRejectFromAnyState: baseConfig.workflow.rejectionRules.allowRejectFromAnyState,
            rejectionCodes: baseConfig.workflow.rejectionRules.rejectionCodes
              ? [...baseConfig.workflow.rejectionRules.rejectionCodes]
              : undefined
          }
        : undefined,
      reentryRules: baseConfig.workflow.reentryRules
        ? Object.fromEntries(
            Object.entries(baseConfig.workflow.reentryRules).map(([key, value]) => [
              key,
              {
                invalidatesApproval: value.invalidatesApproval,
                requiresNewReview: value.requiresNewReview
              }
            ])
          )
        : undefined
    }
  };
}

export function applyEnvironmentVariableOverrides(
  runtimeDefaults: RuntimeDefaults,
  envVars: Record<string, string | undefined>
): RuntimeDefaults {
  const overrides: RuntimeDefaultsOverride = {};

  const providerValue = envVars[ENV_VARIABLE_MAP.provider];
  if (providerValue !== undefined) {
    if (providerValue !== "openai") {
      throw new ConfigValidationError(`Unsupported provider from env: ${providerValue}`);
    }
    overrides.provider = providerValue;
  }

  const modelValue = envVars[ENV_VARIABLE_MAP.model];
  if (modelValue !== undefined) {
    overrides.model = modelValue;
  }

  const temperatureValue = envVars[ENV_VARIABLE_MAP.temperature];
  if (temperatureValue !== undefined) {
    overrides.temperature = parseFloatNumber(temperatureValue, ENV_VARIABLE_MAP.temperature);
  }

  const maxTokensValue = envVars[ENV_VARIABLE_MAP.maxTokens];
  if (maxTokensValue !== undefined) {
    overrides.maxTokens = parseInteger(maxTokensValue, ENV_VARIABLE_MAP.maxTokens);
  }

  const retriesValue = envVars[ENV_VARIABLE_MAP.retries];
  if (retriesValue !== undefined) {
    overrides.retryPolicy = {
      retries: parseInteger(retriesValue, ENV_VARIABLE_MAP.retries)
    };
  }

  const timeoutMsValue = envVars[ENV_VARIABLE_MAP.timeoutMs];
  if (timeoutMsValue !== undefined) {
    overrides.timeoutMs = parseInteger(timeoutMsValue, ENV_VARIABLE_MAP.timeoutMs);
  }

  return {
    ...runtimeDefaults,
    ...overrides,
    retryPolicy: {
      ...runtimeDefaults.retryPolicy,
      ...(overrides.retryPolicy ?? {})
    },
    concurrency: {
      ...runtimeDefaults.concurrency,
      ...(overrides.concurrency ?? {})
    }
  };
}

export function resolveAgentRuntime(
  runtimeDefaults: RuntimeDefaults,
  agents: MergedConfig["agents"]
): ResolvedAgentConfig[] {
  return agents.map((agent) => ({
    id: agent.id,
    role: agent.role,
    ownsStates: [...agent.ownsStates],
    allowedInputs: [...agent.allowedInputs],
    requiredOutputs: [...agent.requiredOutputs],
    allowedNextActions: [...agent.allowedNextActions],
    permissions: { allow: [...agent.permissions.allow] },
    requiredArtifacts: [...agent.requiredArtifacts],
    outputContractSchemaRef: agent.outputContractSchemaRef,
    escalationPolicy: {
      allowed: agent.escalationPolicy.allowed,
      severities: [...agent.escalationPolicy.severities]
    },
    prompt: { ...agent.prompt },
    runtime: {
      ...runtimeDefaults,
      ...agent.runtimeOverrides,
      retryPolicy: {
        ...runtimeDefaults.retryPolicy,
        ...(agent.runtimeOverrides?.retryPolicy ?? {})
      },
      concurrency: {
        ...runtimeDefaults.concurrency,
        ...(agent.runtimeOverrides?.concurrency ?? {})
      }
    }
  }));
}

function toRuntimeDefaultsOverride(runtimeOverrides: RuntimeOverridesFile | undefined): RuntimeDefaultsOverride {
  if (!runtimeOverrides) {
    return {};
  }

  const overrides: RuntimeDefaultsOverride = {};

  if (runtimeOverrides.jsonModeRequired !== undefined) {
    overrides.jsonModeRequired = runtimeOverrides.jsonModeRequired;
  }

  if (runtimeOverrides.defaultProvider !== undefined) {
    overrides.provider = runtimeOverrides.defaultProvider;
  }

  if (runtimeOverrides.defaultModel !== undefined) {
    overrides.model = runtimeOverrides.defaultModel;
  }

  if (runtimeOverrides.fallbackModel !== undefined) {
    overrides.fallbackModel = runtimeOverrides.fallbackModel;
  }

  if (runtimeOverrides.temperature !== undefined) {
    overrides.temperature = runtimeOverrides.temperature;
  }

  if (runtimeOverrides.maxTokens !== undefined) {
    overrides.maxTokens = runtimeOverrides.maxTokens;
  }

  if (runtimeOverrides.maxArtifactsPerOutput !== undefined) {
    overrides.maxArtifactsPerOutput = runtimeOverrides.maxArtifactsPerOutput;
  }

  if (
    runtimeOverrides.retryPolicy?.maxRetries !== undefined ||
    runtimeOverrides.retryPolicy?.backoffMs !== undefined ||
    runtimeOverrides.retryPolicy?.retryOn !== undefined
  ) {
    overrides.retryPolicy = {
      retries: runtimeOverrides.retryPolicy?.maxRetries,
      backoffMs: runtimeOverrides.retryPolicy?.backoffMs,
      retryOn: runtimeOverrides.retryPolicy?.retryOn ? [...runtimeOverrides.retryPolicy.retryOn] : undefined
    };
  }

  if (runtimeOverrides.timeoutMs !== undefined) {
    overrides.timeoutMs = runtimeOverrides.timeoutMs;
  }

  if (
    runtimeOverrides.concurrency?.maxParallelTasks !== undefined ||
    runtimeOverrides.concurrency?.maxParallelActionsPerTask !== undefined
  ) {
    overrides.concurrency = {
      maxParallelTasks: runtimeOverrides.concurrency.maxParallelTasks,
      maxParallelActionsPerTask: runtimeOverrides.concurrency.maxParallelActionsPerTask
    };
  }

  return overrides;
}
