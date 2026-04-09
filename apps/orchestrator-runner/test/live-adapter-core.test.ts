import * as assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";

import type { RuntimeConfigSnapshot } from "@monitor/agent-config";
import type { AgentHandlerContext } from "@monitor/orchestrator-core";

import { createLiveAgentHandler } from "../src/adapters/live/core/execute-live-agent.js";
import {
  AgentSpecificValidationError,
  EnvelopeValidationError,
  ModelCallError,
  PromptLoadError,
  ResponseParseError
} from "../src/adapters/live/core/errors.js";
import { loadPromptTemplateCached } from "../src/adapters/live/core/load-prompt.js";
import { parseOpenAiStructuredResponse } from "../src/adapters/live/core/parse-response.js";
import { validateAgentEnvelopeOutput } from "../src/adapters/live/core/validate-envelope.js";
import { strictObjectSchema } from "../src/adapters/live/schemas/openai-strict-schema.js";

test("loadPromptTemplateCached throws PromptLoadError for missing prompt file", async (context) => {
  const promptsRootDir = await mkdtemp(join(tmpdir(), "live-adapter-prompts-"));
  context.after(async () => rm(promptsRootDir, { recursive: true, force: true }));

  await assert.rejects(
    loadPromptTemplateCached(promptsRootDir, "v1", "missing.prompt.txt"),
    (error: unknown) =>
      error instanceof PromptLoadError && error.message.includes("Failed to load prompt template")
  );
});

test("parseOpenAiStructuredResponse throws ResponseParseError on malformed json", () => {
  assert.throws(
    () => parseOpenAiStructuredResponse("not-json"),
    (error: unknown) =>
      error instanceof ResponseParseError && error.message.includes("Failed to parse OpenAI JSON output")
  );
});

test("validateAgentEnvelopeOutput throws EnvelopeValidationError for invalid envelope", async () => {
  await assert.rejects(
    validateAgentEnvelopeOutput({
      parsed: {
        taskId: "task-invalid-envelope",
        agentRole: "PRODUCT"
      },
      context: "live product agent output",
      nullableFields: ["metrics"]
    }),
    (error: unknown) =>
      error instanceof EnvelopeValidationError &&
      error.message.includes("Schema validation failed for live product agent output")
  );
});

test("createLiveAgentHandler wraps model call failures as ModelCallError", async (context) => {
  const promptsRootDir = await mkdtemp(join(tmpdir(), "live-adapter-prompts-"));
  context.after(async () => rm(promptsRootDir, { recursive: true, force: true }));

  await writePromptFile(promptsRootDir, "v1", "test.prompt.txt", "System prompt");

  const handler = createLiveAgentHandler(
    {
      apiKey: "test-key",
      promptsRootDir,
      fetchImpl: async () => new Response("boom", { status: 500 })
    },
    {
      adapterLabel: "Live Product",
      boundAgentId: "product-agent",
      expectedRole: "PRODUCT",
      responseFormatName: "test_response",
      responseSchema: strictObjectSchema({
        taskId: { type: "string" }
      }),
      envelopeValidationContext: "live product agent output",
      nullableFields: ["risks", "notes", "metrics", "escalation"],
      buildUserPrompt: () => "Run test",
      assertSpecificOutput: () => undefined
    }
  );

  await assert.rejects(
    async () => handler(createContext("task-model-call")),
    (error: unknown) =>
      error instanceof ModelCallError &&
      error.message.includes("OpenAI request failed with status 500")
  );
});

test("createLiveAgentHandler wraps domain assertions as AgentSpecificValidationError", async (context) => {
  const promptsRootDir = await mkdtemp(join(tmpdir(), "live-adapter-prompts-"));
  context.after(async () => rm(promptsRootDir, { recursive: true, force: true }));

  await writePromptFile(promptsRootDir, "v1", "test.prompt.txt", "System prompt");

  const validEnvelope = JSON.stringify({
    taskId: "task-domain-validation",
    agentRole: "PRODUCT",
    status: "completed",
    summary: "ok",
    artifacts: ["product-brief"],
    nextAction: "handoff_to_architect"
  });

  const handler = createLiveAgentHandler(
    {
      apiKey: "test-key",
      promptsRootDir,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: validEnvelope
                }
              }
            ]
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
    },
    {
      adapterLabel: "Live Product",
      boundAgentId: "product-agent",
      expectedRole: "PRODUCT",
      responseFormatName: "test_response",
      responseSchema: strictObjectSchema({
        taskId: { type: "string" },
        agentRole: { type: "string" },
        status: { type: "string" },
        summary: { type: "string" },
        artifacts: { type: "array", items: { type: "string" } },
        nextAction: { type: "string" }
      }),
      envelopeValidationContext: "live product agent output",
      nullableFields: ["risks", "notes", "metrics", "escalation"],
      buildUserPrompt: () => "Run test",
      assertSpecificOutput: () => {
        throw new Error("domain-check-failed");
      }
    }
  );

  await assert.rejects(
    async () => handler(createContext("task-domain-validation")),
    (error: unknown) =>
      error instanceof AgentSpecificValidationError && error.message.includes("domain-check-failed")
  );
});

async function writePromptFile(
  promptsRootDir: string,
  version: string,
  filename: string,
  content: string
): Promise<void> {
  const promptVersionDir = join(promptsRootDir, version);
  await mkdir(promptVersionDir, { recursive: true });
  await writeFile(join(promptVersionDir, filename), content, "utf8");
}

function createContext(taskId: string): AgentHandlerContext {
  const snapshot: RuntimeConfigSnapshot = {
    version: "v1",
    environment: "local",
    compiledAt: "2026-04-09T10:00:00.000Z",
    checksum: "checksum",
    runtimeDefaults: {
      jsonModeRequired: true,
      provider: "openai",
      model: "gpt-5.4-mini",
      fallbackModel: "gpt-5.4-mini",
      temperature: 0.2,
      maxTokens: 1000,
      maxArtifactsPerOutput: 10,
      retryPolicy: {
        retries: 1,
        backoffMs: 100,
        retryOn: ["timeout"]
      },
      timeoutMs: 1000,
      concurrency: {
        maxParallelTasks: 1,
        maxParallelActionsPerTask: 1
      }
    },
    approvalPolicy: { allowMockApprovals: true },
    promptSetVersion: "v1",
    promptSetChecksum: "prompt-checksum",
    workflow: {
      states: ["INTAKE", "DESIGN"],
      initialState: "INTAKE",
      terminalStates: ["DESIGN"],
      transitions: [{ from: "INTAKE", to: "DESIGN" }],
      stateOwners: {
        INTAKE: "PRODUCT",
        DESIGN: "ARCHITECT"
      }
    },
    agents: [
      {
        id: "product-agent",
        role: "PRODUCT",
        ownsStates: ["INTAKE"],
        allowedInputs: ["task"],
        requiredOutputs: ["summary"],
        allowedNextActions: ["handoff_to_architect"],
        permissions: { allow: ["docs.read"] },
        requiredArtifacts: ["product-brief"],
        outputContractSchemaRef: "agent-output-envelope.v1",
        escalationPolicy: {
          allowed: true,
          severities: ["high"]
        },
        prompt: {
          version: "v1",
          template: "test.prompt.txt"
        },
        runtime: {
          jsonModeRequired: true,
          provider: "openai",
          model: "gpt-5.4-mini",
          fallbackModel: "gpt-5.4-mini",
          temperature: 0.2,
          maxTokens: 1000,
          maxArtifactsPerOutput: 10,
          retryPolicy: {
            retries: 1,
            backoffMs: 100,
            retryOn: ["timeout"]
          },
          timeoutMs: 1000,
          concurrency: {
            maxParallelTasks: 1,
            maxParallelActionsPerTask: 1
          }
        }
      }
    ]
  };

  const agent = snapshot.agents[0];
  if (!agent) {
    throw new Error("Test setup error: expected product agent in snapshot");
  }

  return {
    task: {
      taskId,
      requestedBy: "tester",
      workflowState: "INTAKE",
      input: { title: "test" },
      configVersion: "v1",
      artifactRefs: []
    },
    targetState: "DESIGN",
    snapshot,
    agent
  };
}
