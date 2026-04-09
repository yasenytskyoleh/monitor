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

export type OpenAiArchitectAgentHandlerOptions = {
  apiKey?: string;
  baseUrl?: string;
  promptsRootDir?: string;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
};

const PROMPT_CACHE = new Map<string, string>();

export function createOpenAiArchitectAgentHandler(
  options: OpenAiArchitectAgentHandlerOptions = {}
): AgentHandler {
  const fetchImpl = options.fetchImpl ?? fetch;
  if (!fetchImpl) {
    throw new OrchestratorExecutionError("Global fetch is not available for OpenAI architect handler");
  }

  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OrchestratorExecutionError("OPENAI_API_KEY is required for OpenAI architect handler");
  }

  const baseUrl = (options.baseUrl ?? process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const promptsRootDir = options.promptsRootDir ?? join(process.cwd(), "configs/agents/prompts");

  return async (context: AgentHandlerContext): Promise<AgentOutputEnvelope> => {
    if (context.agent.id !== "architect-agent") {
      throw new OrchestratorExecutionError(
        `OpenAI architect handler is bound to 'architect-agent', received '${context.agent.id}'`
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

    try {
      return parseAgentOutput(content, context);
    } catch (error) {
      if (!(error instanceof OrchestratorExecutionError)) {
        throw error;
      }

      const repairedContent = await completeChat({
        apiKey,
        baseUrl,
        timeoutMs,
        body: buildRepairRequestBody({
          model,
          rawOutput: content,
          errorMessage: error.message,
          context
        }),
        fetchImpl
      });

      return parseAgentOutput(repairedContent, context);
    }
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
  const requiredArtifactsForTargetState = getRequiredArtifactsForTargetState(context);
  const payload = {
    task: context.task,
    targetState: context.targetState,
    contract: {
      requiredFields: ["taskId", "agentRole", "status", "summary", "artifacts", "nextAction"],
      allowedStatus: ["completed", "blocked", "needs_escalation", "rejected"],
      allowedNextActions: [
        "handoff_to_quant",
        "await_approval",
        "request_more_context",
        "close_task",
        "reject_task",
        "request_architecture_clarification",
        "return_to_implement"
      ],
      escalationRequirement:
        "If status is 'needs_escalation', include full escalation object with taskId, agentRole, workflowState, severity, reason, riskNotes, requestedDecision.",
      requiredArtifactsForTargetState
    },
    outputFocus: {
      include: [
        "module_boundaries",
        "data_flow",
        "contract_definitions",
        "adr_draft",
        "risk_notes"
      ]
    }
  };

  return [
    "Produce Architect Agent output for the provided task envelope.",
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

function buildRepairRequestBody(options: {
  model: string;
  rawOutput: string;
  errorMessage: string;
  context: AgentHandlerContext;
}): Record<string, unknown> {
  const requiredArtifactsForTargetState = getRequiredArtifactsForTargetState(options.context);
  const contract = {
    requiredFields: ["taskId", "agentRole", "status", "summary", "artifacts", "nextAction"],
    allowedStatus: ["completed", "blocked", "needs_escalation", "rejected"],
    allowedNextActions: [
      "handoff_to_architect",
      "handoff_to_quant",
      "handoff_to_backend",
      "handoff_to_docs_reviewer",
      "await_approval",
      "request_more_context",
      "close_task",
      "reject_task",
      "request_architecture_clarification",
      "return_to_implement"
    ],
    escalationRequirement:
      "If status is needs_escalation, include full escalation object with taskId, agentRole, workflowState, severity, reason, riskNotes, requestedDecision.",
    artifactsRequirement:
      "artifacts must be an array of non-empty strings (convert object-like artifacts into string refs).",
    requiredArtifactsForTargetState
  };

  const payload = {
    taskId: options.context.task.taskId,
    agentRole: options.context.agent.role,
    workflowState: options.context.task.workflowState,
    parseError: options.errorMessage,
    rawOutput: options.rawOutput,
    contract
  };

  return {
    model: options.model,
    temperature: 0,
    response_format: {
      type: "json_object" as const
    },
    messages: [
      {
        role: "system" as const,
        content:
          "Repair the provided output into a valid Agent Output Envelope JSON. Return only a single JSON object."
      },
      {
        role: "user" as const,
        content: JSON.stringify(payload, null, 2)
      }
    ]
  };
}

function parseAgentOutput(content: string, context: AgentHandlerContext): AgentOutputEnvelope {
  const normalized = stripCodeFences(content).trim();
  const jsonCandidate = extractJsonObject(normalized);

  try {
    const raw = JSON.parse(jsonCandidate) as unknown;
    return normalizeEnvelope(raw, context);
  } catch (error) {
    if (error instanceof OrchestratorExecutionError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new OrchestratorExecutionError(
        `Failed to parse OpenAI JSON output: ${error.message}`
      );
    }

    throw new OrchestratorExecutionError(
      `Failed to parse OpenAI JSON output: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function normalizeEnvelope(raw: unknown, context: AgentHandlerContext): AgentOutputEnvelope {
  const record = extractRecord(raw, "root");
  const source = getOptionalObject(record.output) ?? record;

  const taskId = getRequiredString(source, ["taskId", "task_id"]);
  const agentRole = normalizeAgentRole(getRequiredString(source, ["agentRole", "agent_role"]));
  const status = normalizeStatus(getRequiredString(source, ["status"]));
  const nextAction = normalizeNextAction(getRequiredString(source, ["nextAction", "next_action"]));
  const artifacts = ensureTargetArtifacts(
    getRequiredStringArray(source.artifacts, "artifacts"),
    context
  );
  const summary = resolveSummary(source, status, nextAction);

  const envelope: AgentOutputEnvelope = {
    taskId,
    agentRole,
    status,
    summary,
    artifacts,
    nextAction
  };

  const risks = getOptionalStringArray(source.risks);
  if (risks) {
    envelope.risks = risks;
  }

  const notes = getOptionalNotes(source.notes);
  if (notes !== undefined) {
    envelope.notes = notes;
  }

  const metrics = getOptionalObject(source.metrics);
  if (metrics) {
    envelope.metrics = metrics;
  }

  const escalation = resolveEscalation(source, status);
  if (escalation) {
    envelope.escalation = escalation;
  }

  return envelope;
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

function extractRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new OrchestratorExecutionError(`OpenAI output field '${fieldName}' must be an object`);
  }
  return value as Record<string, unknown>;
}

function getRequiredString(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  throw new OrchestratorExecutionError(`OpenAI output missing required string field: ${keys.join(" | ")}`);
}

function getRequiredStringArray(value: unknown, fieldName: string): string[] {
  let normalized: string[] = [];
  if (typeof value === "string") {
    normalized = normalizeStringArrayLike([value]);
  } else if (Array.isArray(value)) {
    normalized = normalizeStringArrayLike(value);
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    normalized = normalizeStringArrayLike([value]);
  } else {
    throw new OrchestratorExecutionError(`OpenAI output missing required array field: ${fieldName}`);
  }

  if (normalized.length === 0) {
    throw new OrchestratorExecutionError(
      `OpenAI output field '${fieldName}' must contain at least one non-empty string`
    );
  }

  return Array.from(new Set(normalized));
}

function getOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "string") {
    const normalized = normalizeStringArrayLike([value]);
    return normalized.length > 0 ? normalized : undefined;
  }
  if (Array.isArray(value)) {
    const normalized = normalizeStringArrayLike(value);
    return normalized.length > 0 ? normalized : undefined;
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const normalized = normalizeStringArrayLike([value]);
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

function getOptionalString(source: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function getOptionalValue(source: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }
  return undefined;
}

function resolveSummary(
  source: Record<string, unknown>,
  status: AgentOutputEnvelope["status"],
  nextAction: AgentOutputEnvelope["nextAction"]
): string {
  const summary = getOptionalString(source, [
    "summary",
    "shortSummary",
    "short_summary",
    "decisionSummary",
    "decision_summary",
    "analysisSummary",
    "analysis_summary",
    "rationale",
    "reasoning",
    "analysis",
    "reason",
    "decision",
    "result",
    "message"
  ]);
  if (summary) {
    return summary;
  }

  const notes = getOptionalNotes(source.notes);
  if (typeof notes === "string") {
    return notes;
  }
  if (Array.isArray(notes) && notes.length > 0) {
    return notes[0] as string;
  }

  const escalationSource = getOptionalObject(source.escalation);
  if (escalationSource) {
    const escalationReason = getOptionalString(escalationSource, ["reason"]);
    if (escalationReason) {
      return escalationReason;
    }
  }

  return `Auto-generated summary: status=${status}; nextAction=${nextAction}.`;
}

function getRequiredArtifactsForTargetState(context: AgentHandlerContext): string[] {
  return context.snapshot.workflow.requiredArtifactsByState?.[context.targetState] ?? [];
}

function ensureTargetArtifacts(
  artifacts: string[],
  context: AgentHandlerContext
): string[] {
  const requiredArtifacts = getRequiredArtifactsForTargetState(context);
  if (requiredArtifacts.length === 0) {
    return artifacts;
  }

  const merged = [...artifacts];
  for (const artifact of requiredArtifacts) {
    if (!merged.includes(artifact)) {
      merged.push(artifact);
    }
  }
  return merged;
}

function getOptionalNotes(value: unknown): string | string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

function getOptionalObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeStringArrayLike(values: readonly unknown[]): string[] {
  const normalized: string[] = [];

  for (const item of values) {
    if (typeof item === "string") {
      const trimmed = item.trim();
      if (trimmed.length > 0) {
        normalized.push(trimmed);
      }
      continue;
    }

    if (item && typeof item === "object" && !Array.isArray(item)) {
      const objectItem = item as Record<string, unknown>;
      let matched = false;
      const candidates: unknown[] = [
        objectItem.name,
        objectItem.id,
        objectItem.key,
        objectItem.ref,
        objectItem.artifact,
        objectItem.label,
        objectItem.value
      ];

      for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim().length > 0) {
          normalized.push(candidate.trim());
          matched = true;
          break;
        }
      }

      if (!matched) {
        for (const [key, candidateValue] of Object.entries(objectItem)) {
          if (
            key.trim().length > 0 &&
            candidateValue !== null &&
            candidateValue !== undefined &&
            candidateValue !== false
          ) {
            normalized.push(key.trim());
          }
        }
      }
    }
  }

  return Array.from(new Set(normalized));
}

function resolveEscalation(
  source: Record<string, unknown>,
  status: AgentOutputEnvelope["status"]
): Record<string, unknown> | undefined {
  const escalationSource = getOptionalObject(source.escalation);
  if (status === "needs_escalation" && !escalationSource) {
    throw new OrchestratorExecutionError(
      "OpenAI output with status 'needs_escalation' must include an escalation object"
    );
  }

  if (!escalationSource) {
    return undefined;
  }

  const escalation: Record<string, unknown> = {
    taskId: getRequiredString(escalationSource, ["taskId", "task_id"]),
    agentRole: normalizeAgentRole(getRequiredString(escalationSource, ["agentRole", "agent_role"])),
    workflowState: getRequiredString(escalationSource, ["workflowState", "workflow_state"]),
    severity: normalizeEscalationSeverity(getRequiredString(escalationSource, ["severity"])),
    reason: getRequiredString(escalationSource, ["reason"]),
    riskNotes: getRequiredStringArray(
      getOptionalValue(escalationSource, ["riskNotes", "risk_notes"]),
      "escalation.riskNotes"
    ),
    requestedDecision: getRequiredString(escalationSource, ["requestedDecision", "requested_decision"])
  };

  const blockingArtifacts = getOptionalStringArray(
    getOptionalValue(escalationSource, ["blockingArtifacts", "blocking_artifacts"])
  );
  if (blockingArtifacts) {
    escalation.blockingArtifacts = blockingArtifacts;
  }

  const recommendedNextAction = getOptionalString(escalationSource, [
    "recommendedNextAction",
    "recommended_next_action"
  ]);
  if (recommendedNextAction) {
    escalation.recommendedNextAction = recommendedNextAction;
  }

  const relatedApprovalType = getOptionalString(escalationSource, [
    "relatedApprovalType",
    "related_approval_type"
  ]);
  if (relatedApprovalType) {
    escalation.relatedApprovalType = normalizeRelatedApprovalType(relatedApprovalType);
  }

  const relatedContractRefs = getOptionalStringArray(
    getOptionalValue(escalationSource, ["relatedContractRefs", "related_contract_refs"])
  );
  if (relatedContractRefs) {
    escalation.relatedContractRefs = relatedContractRefs;
  }

  return escalation;
}

function normalizeAgentRole(value: string): AgentOutputEnvelope["agentRole"] {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (normalized === "PRODUCT" || normalized === "PRODUCT_AGENT") {
    return "PRODUCT";
  }

  if (normalized === "ARCHITECT" || normalized === "ARCHITECT_AGENT") {
    return "ARCHITECT";
  }

  if (normalized === "BACKEND" || normalized === "BACKEND_AGENT") {
    return "BACKEND";
  }

  if (
    normalized === "QUANT_PATTERN" ||
    normalized === "QUANT_PATTERN_AGENT" ||
    normalized === "QUANT"
  ) {
    return "QUANT_PATTERN";
  }

  if (normalized === "DOCS_REVIEWER" || normalized === "DOCS_REVIEWER_AGENT") {
    return "DOCS_REVIEWER";
  }

  throw new OrchestratorExecutionError(`Unsupported agentRole in OpenAI output: ${value}`);
}

function normalizeStatus(value: string): AgentOutputEnvelope["status"] {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (normalized === "completed" || normalized === "blocked" || normalized === "needs_escalation" || normalized === "rejected") {
    return normalized;
  }

  if (normalized === "needs_escalate" || normalized === "escalation") {
    return "needs_escalation";
  }

  throw new OrchestratorExecutionError(`Unsupported status in OpenAI output: ${value}`);
}

function normalizeEscalationSeverity(value: string): "low" | "medium" | "high" | "critical" {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "critical") {
    return normalized;
  }

  throw new OrchestratorExecutionError(`Unsupported escalation severity in OpenAI output: ${value}`);
}

function normalizeRelatedApprovalType(value: string): "ARCHITECTURE" | "SIGNAL_PUBLISH" {
  const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, "_");

  if (normalized === "ARCHITECTURE" || normalized === "SIGNAL_PUBLISH") {
    return normalized;
  }

  if (normalized === "SIGNALPUBLISH") {
    return "SIGNAL_PUBLISH";
  }

  throw new OrchestratorExecutionError(`Unsupported relatedApprovalType in OpenAI output: ${value}`);
}

function normalizeNextAction(value: string): AgentOutputEnvelope["nextAction"] {
  const mapped = mapNextAction(value);
  if (mapped) {
    return mapped;
  }

  throw new OrchestratorExecutionError(`Unsupported nextAction in OpenAI output: ${value}`);
}

function mapNextAction(value: string): AgentOutputEnvelope["nextAction"] | null {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (
    normalized === "handoff_to_architect" ||
    normalized === "handoff_to_quant" ||
    normalized === "handoff_to_backend" ||
    normalized === "handoff_to_docs_reviewer" ||
    normalized === "await_approval" ||
    normalized === "request_more_context" ||
    normalized === "close_task" ||
    normalized === "reject_task" ||
    normalized === "request_architecture_clarification" ||
    normalized === "return_to_implement"
  ) {
    return normalized;
  }

  if (normalized === "handoff_to_docs_reviewer_agent") {
    return "handoff_to_docs_reviewer";
  }

  return null;
}
