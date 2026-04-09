import { join } from "node:path";

import type { AgentHandlers } from "@monitor/orchestrator-core";

import { createLiveArchitectAgentHandler } from "../adapters/live/architect-agent.js";
import { createLiveProductAgentHandler } from "../adapters/live/product-agent.js";
import { createMockHandlers } from "../mock-handlers.js";
import { hasLiveAgents, SUPPORTED_AGENT_IDS } from "./agent-modes.js";
import type { AgentExecutionMap } from "../types.js";

export type ResolveHandlersOptions = {
  rootDir: string;
  agentModes: AgentExecutionMap;
  openAiApiKey?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

export type ResolvedHandlers = {
  handlers: AgentHandlers;
  executedBy: string;
};

export function resolveHandlers(options: ResolveHandlersOptions): ResolvedHandlers {
  const handlers: AgentHandlers = createMockHandlers();

  for (const agentId of SUPPORTED_AGENT_IDS) {
    const mode = options.agentModes[agentId];
    if (mode === "mock") {
      continue;
    }

    if (agentId === "product-agent") {
      if (!options.openAiApiKey) {
        throw new Error("OPENAI_API_KEY is required for product-agent live handler");
      }

      handlers[agentId] = createLiveProductAgentHandler({
        apiKey: options.openAiApiKey,
        promptsRootDir: join(options.rootDir, "configs/agents/prompts"),
        model: options.model,
        temperature: options.temperature,
        timeoutMs: options.timeoutMs,
        fetchImpl: options.fetchImpl
      });
      continue;
    }

    if (agentId === "architect-agent") {
      if (!options.openAiApiKey) {
        throw new Error("OPENAI_API_KEY is required for architect-agent live handler");
      }

      handlers[agentId] = createLiveArchitectAgentHandler({
        apiKey: options.openAiApiKey,
        promptsRootDir: join(options.rootDir, "configs/agents/prompts"),
        model: options.model,
        temperature: options.temperature,
        timeoutMs: options.timeoutMs,
        fetchImpl: options.fetchImpl
      });
      continue;
    }

    throw new Error(`Live mode requested for '${agentId}', but no live handler is implemented`);
  }

  return {
    handlers,
    executedBy: hasLiveAgents(options.agentModes)
      ? "orchestrator-runner-mixed"
      : "orchestrator-runner-mock"
  };
}
