import type { AgentExecutionMap, ExecutionMode, RunnerMode } from "../types.js";

export const SUPPORTED_AGENT_IDS = [
  "product-agent",
  "architect-agent",
  "quant-pattern-agent",
  "backend-agent",
  "docs-reviewer-agent"
] as const;

export type SupportedAgentId = (typeof SUPPORTED_AGENT_IDS)[number];

const LIVE_IMPLEMENTED_AGENTS: ReadonlySet<SupportedAgentId> = new Set([
  "product-agent",
  "architect-agent",
  "quant-pattern-agent",
  "docs-reviewer-agent"
]);

const AGENT_ALIAS_TO_ID: Record<string, SupportedAgentId> = {
  product: "product-agent",
  architect: "architect-agent",
  "quant-pattern": "quant-pattern-agent",
  backend: "backend-agent",
  "docs-reviewer": "docs-reviewer-agent",
  "product-agent": "product-agent",
  "architect-agent": "architect-agent",
  "quant-pattern-agent": "quant-pattern-agent",
  "backend-agent": "backend-agent",
  "docs-reviewer-agent": "docs-reviewer-agent"
};

export function parseAgentModeOverrides(raw: string): Partial<AgentExecutionMap> {
  const overrides: Partial<AgentExecutionMap> = {};
  const seen = new Set<SupportedAgentId>();

  for (const rawPair of raw.split(",")) {
    const pair = rawPair.trim();
    if (pair.length === 0) {
      throw new Error("Invalid --agent-mode: empty entry");
    }

    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0 || separatorIndex === pair.length - 1) {
      throw new Error(`Invalid --agent-mode entry '${pair}'. Expected <agent>=<mock|live>`);
    }

    const agentToken = pair.slice(0, separatorIndex).trim();
    const modeToken = pair.slice(separatorIndex + 1).trim();
    const agentId = AGENT_ALIAS_TO_ID[agentToken];
    if (!agentId) {
      throw new Error(
        `Invalid --agent-mode agent '${agentToken}'. Allowed: ${listAllowedAgentAliases()}`
      );
    }

    if (modeToken !== "mock" && modeToken !== "live") {
      throw new Error(`Invalid --agent-mode value '${modeToken}'. Allowed: mock, live`);
    }

    if (seen.has(agentId)) {
      throw new Error(`Duplicate --agent-mode override for '${agentId}'`);
    }
    seen.add(agentId);
    overrides[agentId] = modeToken;
  }

  return overrides;
}

export function resolveAgentExecutionMap(
  mode: RunnerMode,
  overrides: Partial<AgentExecutionMap>
): AgentExecutionMap {
  const resolved = {} as AgentExecutionMap;

  for (const agentId of SUPPORTED_AGENT_IDS) {
    if (mode === "mock") {
      resolved[agentId] = "mock";
      continue;
    }

    resolved[agentId] = LIVE_IMPLEMENTED_AGENTS.has(agentId) ? "live" : "mock";
  }

  for (const agentId of SUPPORTED_AGENT_IDS) {
    const override = overrides[agentId];
    if (override) {
      resolved[agentId] = override;
    }
  }

  validateResolvedAgentExecutionMap(resolved);
  return resolved;
}

export function hasLiveAgents(agentModes: AgentExecutionMap): boolean {
  return SUPPORTED_AGENT_IDS.some((agentId) => agentModes[agentId] === "live");
}

export function assertLiveModeSupported(agentId: SupportedAgentId, mode: ExecutionMode): void {
  if (mode === "live" && !LIVE_IMPLEMENTED_AGENTS.has(agentId)) {
    throw new Error(
      `Live mode requested for '${agentId}', but no live handler is implemented`
    );
  }
}

function validateResolvedAgentExecutionMap(agentModes: AgentExecutionMap): void {
  for (const agentId of SUPPORTED_AGENT_IDS) {
    const value = agentModes[agentId];
    if (value !== "mock" && value !== "live") {
      throw new Error(`Invalid execution mode for '${agentId}': ${String(value)}`);
    }
    assertLiveModeSupported(agentId, value);
  }
}

function listAllowedAgentAliases(): string {
  return [
    "product",
    "architect",
    "quant-pattern",
    "backend",
    "docs-reviewer",
    ...SUPPORTED_AGENT_IDS
  ].join(", ");
}
