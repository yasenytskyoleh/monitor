import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { OrchestratorExecutionError } from "../errors.js";
import type { AgentHandler, AgentHandlerContext, AgentOutputEnvelope } from "../types.js";

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export type OpenAiProductAgentHandlerOptions = {
  apiKey?: string;
  baseUrl?: string;
  promptsRootDir?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

const PROMPT_CACHE = new Map<string, string>();

export function createOpenAiProductAgentHandler(
  options: OpenAiProductAgentHandlerOptions = {}
): AgentHandler {
  const fetchImpl = options.fetchImpl ?? fetch;
  if (!fetchImpl) {
    throw new OrchestratorExecutionError("Global fetch is not available for OpenAI product handler");
  }

  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OrchestratorExecutionError("OPENAI_API_KEY is required for OpenAI product handler");
  }

  const baseUrl = (options.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const promptsRootDir = options.promptsRootDir ?? join(process.cwd(), "configs/agents/prompts");

  return async (context: AgentHandlerContext): Promise<AgentOutputEnvelope> => {
    if (context.agent.id !== "product-agent") {
      throw new OrchestratorExecutionError(
        `OpenAI product handler is bound to 'product-agent', received '${context.agent.id}'`
      );
    }

    const promptText = await loadPromptTemplate(
      promptsRootDir,
      context.agent.prompt.version,
      context.agent.prompt.template
    );

    const model = options.model ?? process.env.OPENAI_MODEL ?? context.agent.runtime.model;
    const temperature = options.temperature ?? context.agent.runtime.temperature;
    const timeoutMs = options.timeoutMs ?? context.agent.runtime.timeoutMs;

    const requestBody = {
      model,
      temperature,
      response_format: {
        type: "json_object" as const
      },
      messages: [
        {
          role: "system" as const,
          content: [
            promptText,
            "Return strictly one JSON object that matches Agent Output Envelope v1.",
            "Do not include markdown code fences."
          ].join("\n\n")
        },
        {
          role: "user" as const,
          content: buildUserPrompt(context)
        }
      ]
    };

    const content = await completeChat({
      apiKey,
      baseUrl,
      timeoutMs,
      body: requestBody,
      fetchImpl
    });

    return parseAgentOutput(content);
  };
}

async function loadPromptTemplate(
  promptsRootDir: string,
  promptVersion: string,
  promptFile: string
): Promise<string> {
  const cacheKey = `${promptsRootDir}/${promptVersion}/${promptFile}`;
  const cached = PROMPT_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  const promptPath = join(promptsRootDir, promptVersion, promptFile);
  const promptText = await readFile(promptPath, "utf8");
  PROMPT_CACHE.set(cacheKey, promptText);
  return promptText;
}

function buildUserPrompt(context: AgentHandlerContext): string {
  const payload = {
    task: context.task,
    targetState: context.targetState,
    contract: {
      requiredFields: ["taskId", "agentRole", "status", "summary", "artifacts", "nextAction"],
      allowedStatus: ["completed", "blocked", "needs_escalation", "rejected"],
      allowedNextAction: [
        "handoff_to_architect",
        "handoff_to_quant",
        "handoff_to_backend",
        "handoff_to_docs_reviewer",
        "await_approval",
        "request_more_context",
        "close_task"
      ]
    }
  };

  return [
    "Produce Product Agent output for the provided task envelope.",
    "Return JSON only.",
    JSON.stringify(payload, null, 2)
  ].join("\n\n");
}

async function completeChat(options: {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
  body: Record<string, unknown>;
  fetchImpl: typeof fetch;
}): Promise<string> {
  const endpoint = `${options.baseUrl}/chat/completions`;
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await options.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`
      },
      body: JSON.stringify(options.body),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorBody = await safeReadText(response);
      throw new OrchestratorExecutionError(
        `OpenAI request failed with status ${response.status}: ${errorBody || "no response body"}`
      );
    }

    const payload = (await response.json()) as OpenAiChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content || !content.trim()) {
      throw new OrchestratorExecutionError("OpenAI response did not include message content");
    }

    return content;
  } catch (error) {
    if (error instanceof OrchestratorExecutionError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new OrchestratorExecutionError(`OpenAI request timed out after ${options.timeoutMs}ms`);
    }

    throw new OrchestratorExecutionError(
      `OpenAI request failed: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function parseAgentOutput(content: string): AgentOutputEnvelope {
  const normalized = stripCodeFences(content).trim();
  const jsonCandidate = extractJsonObject(normalized);

  try {
    return JSON.parse(jsonCandidate) as AgentOutputEnvelope;
  } catch (error) {
    throw new OrchestratorExecutionError(
      `Failed to parse OpenAI JSON output: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function stripCodeFences(content: string): string {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fencedMatch?.[1] ?? content;
}

function extractJsonObject(content: string): string {
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace < 0 || lastBrace < firstBrace) {
    throw new OrchestratorExecutionError("OpenAI output does not contain a JSON object");
  }
  return content.slice(firstBrace, lastBrace + 1);
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
