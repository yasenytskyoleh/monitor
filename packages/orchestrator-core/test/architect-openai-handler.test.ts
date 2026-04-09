import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import type { RuntimeConfigSnapshot } from "@monitor/agent-config";

import { OrchestratorExecutionError } from "../src/errors.js";
import { createOpenAiArchitectAgentHandler } from "../src/handlers/architect-openai.js";
import type { AgentHandlerContext } from "../src/types.js";

const SNAPSHOT: RuntimeConfigSnapshot = {
  version: "v1",
  environment: "local",
  compiledAt: "2026-04-08T00:00:00.000Z",
  checksum: "a".repeat(64),
  promptSetVersion: "v1",
  promptSetChecksum: "b".repeat(64),
  runtimeDefaults: {
    jsonModeRequired: true,
    provider: "openai",
    model: "gpt-5.4-mini",
    fallbackModel: "gpt-5.4-mini",
    temperature: 0.2,
    maxTokens: 4000,
    maxArtifactsPerOutput: 10,
    retryPolicy: {
      retries: 2,
      backoffMs: 1000,
      retryOn: ["timeout", "rate_limit", "transient_error"]
    },
    timeoutMs: 30000,
    concurrency: {
      maxParallelTasks: 1,
      maxParallelActionsPerTask: 1
    }
  },
  approvalPolicy: {
    allowMockApprovals: true
  },
  workflow: {
    states: ["DESIGN", "FORMALIZE"],
    initialState: "DESIGN",
    terminalStates: ["FORMALIZE"],
    stateOwners: {
      DESIGN: "ARCHITECT",
      FORMALIZE: "QUANT_PATTERN"
    },
    transitions: [
      {
        from: "DESIGN",
        to: "FORMALIZE",
        requiresApproval: true,
        approvalType: "ARCHITECTURE"
      }
    ]
  },
  agents: [
    {
      id: "architect-agent",
      role: "ARCHITECT",
      ownsStates: ["DESIGN"],
      allowedInputs: ["approved-scope"],
      requiredOutputs: ["module-boundaries", "data-flow", "contract-definitions", "adr-draft", "risk-notes"],
      allowedNextActions: ["handoff_to_quant", "await_approval", "request_more_context", "reject_task"],
      permissions: {
        allow: ["docs.read", "contracts.read", "architecture.draft", "workflow.escalate"]
      },
      requiredArtifacts: ["product-brief", "architecture-design", "adr-draft"],
      outputContractSchemaRef: "agent-output-envelope.v1",
      escalationPolicy: {
        allowed: true,
        severities: ["low", "medium", "high", "critical"]
      },
      prompt: {
        version: "v1",
        template: "architect-agent.txt"
      },
      runtime: {
        jsonModeRequired: true,
        provider: "openai",
        model: "gpt-5.4-mini",
        fallbackModel: "gpt-5.4-mini",
        temperature: 0.2,
        maxTokens: 4000,
        maxArtifactsPerOutput: 10,
        retryPolicy: {
          retries: 2,
          backoffMs: 1000,
          retryOn: ["timeout", "rate_limit", "transient_error"]
        },
        timeoutMs: 30000,
        concurrency: {
          maxParallelTasks: 1,
          maxParallelActionsPerTask: 1
        }
      }
    }
  ]
};

async function createPromptFixtureDir(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "architect-openai-handler-"));
  await mkdir(join(root, "v1"), { recursive: true });
  await writeFile(
    join(root, "v1", "architect-agent.txt"),
    "You are the Architect Agent. Return a valid output envelope.",
    "utf8"
  );
  return root;
}

function createContext(): AgentHandlerContext {
  const agent = SNAPSHOT.agents[0];
  if (!agent) {
    throw new Error("Missing architect agent fixture");
  }

  return {
    task: {
      taskId: "task-200",
      requestedBy: "tester",
      workflowState: "DESIGN",
      input: { title: "Architecture test" },
      configVersion: "v1",
      artifactRefs: ["product-brief"]
    },
    targetState: "FORMALIZE",
    snapshot: SNAPSHOT,
    agent
  };
}

test("calls OpenAI and parses Architect Agent envelope JSON", async () => {
  const promptsRootDir = await createPromptFixtureDir();
  let capturedBody: unknown;

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async (_url, init) => {
      capturedBody = init?.body ? JSON.parse(String(init.body)) : undefined;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  taskId: "task-200",
                  agentRole: "ARCHITECT",
                  status: "completed",
                  summary: "Architecture draft produced",
                  artifacts: ["adr-draft", "architecture-design"],
                  nextAction: "handoff_to_quant"
                })
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
      );
    }
  });

  const output = await handler(createContext());

  assert.equal(output.taskId, "task-200");
  assert.equal(output.agentRole, "ARCHITECT");
  assert.equal(output.status, "completed");
  assert.deepEqual(output.artifacts, ["adr-draft", "architecture-design"]);
  assert.equal(output.nextAction, "handoff_to_quant");
  assert.equal((capturedBody as { model: string }).model, "gpt-5.4-mini");
});

test("normalizes common snake_case fields and ignores unsupported top-level fields", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-200",
                  agent_role: "architect_agent",
                  status: "completed",
                  summary: "Architecture draft produced",
                  artifacts: ["adr-draft", "architecture-design"],
                  next_action: "handoff_to_quant",
                  module_boundaries: ["api", "strategy"],
                  data_flow: ["ingest -> evaluate -> signal"]
                })
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
  });

  const output = await handler(createContext());

  assert.equal(output.taskId, "task-200");
  assert.equal(output.agentRole, "ARCHITECT");
  assert.equal(output.nextAction, "handoff_to_quant");
  assert.equal(output.summary, "Architecture draft produced");
});

test("accepts summary alias fields when summary is missing", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-200",
                  agent_role: "architect_agent",
                  status: "completed",
                  decision: "Architecture boundaries and contracts are ready.",
                  artifacts: ["adr-draft", "architecture-design"],
                  next_action: "handoff_to_quant"
                })
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
  });

  const output = await handler(createContext());

  assert.equal(output.summary, "Architecture boundaries and contracts are ready.");
});

test("synthesizes summary when model omits all summary-like fields", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-200",
                  agent_role: "architect_agent",
                  status: "completed",
                  artifacts: ["adr-draft", "architecture-design"],
                  next_action: "handoff_to_quant"
                })
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
  });

  const output = await handler(createContext());

  assert.equal(
    output.summary,
    "Auto-generated summary: status=completed; nextAction=handoff_to_quant."
  );
});

test("normalizes object-shaped artifacts into string artifact refs", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-200",
                  agent_role: "architect_agent",
                  status: "completed",
                  summary: "Artifact object normalization",
                  artifacts: [{ name: "adr-draft" }, { id: "architecture-design" }],
                  next_action: "handoff_to_quant"
                })
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
  });

  const output = await handler(createContext());

  assert.deepEqual(output.artifacts, ["adr-draft", "architecture-design"]);
});

test("normalizes object-map artifacts into string artifact refs", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-200",
                  agent_role: "architect_agent",
                  status: "completed",
                  summary: "Artifact map normalization",
                  artifacts: {
                    "adr-draft": true,
                    "architecture-design": "ready"
                  },
                  next_action: "handoff_to_quant"
                })
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
  });

  const output = await handler(createContext());

  assert.deepEqual(output.artifacts, ["adr-draft", "architecture-design"]);
});

test("adds target-state required artifacts when model output omits them", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-200",
                  agent_role: "architect_agent",
                  status: "completed",
                  summary: "Model omitted mandatory target artifact.",
                  artifacts: ["adr-draft"],
                  next_action: "handoff_to_quant"
                })
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
  });

  const context = createContext();
  context.snapshot = {
    ...context.snapshot,
    workflow: {
      ...context.snapshot.workflow,
      requiredArtifactsByState: {
        ...(context.snapshot.workflow.requiredArtifactsByState ?? {}),
        FORMALIZE: ["adr-draft", "architecture-design"]
      }
    }
  };

  const output = await handler(context);

  assert.deepEqual(output.artifacts, ["adr-draft", "architecture-design"]);
});

test("retries once with repair prompt when first output fails strict parsing", async () => {
  const promptsRootDir = await createPromptFixtureDir();
  let callCount = 0;

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () => {
      callCount += 1;

      const content =
        callCount === 1
          ? {
              task_id: "task-200",
              agent_role: "architect_agent",
              status: "completed",
              summary: "First pass invalid artifacts",
              artifacts: [],
              next_action: "handoff_to_quant"
            }
          : {
              task_id: "task-200",
              agent_role: "architect_agent",
              status: "completed",
              summary: "Repaired output",
              artifacts: ["adr-draft", "architecture-design"],
              next_action: "handoff_to_quant"
            };

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify(content)
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
      );
    }
  });

  const output = await handler(createContext());

  assert.equal(callCount, 2);
  assert.equal(output.summary, "Repaired output");
  assert.deepEqual(output.artifacts, ["adr-draft", "architecture-design"]);
});

test("fails when OpenAI omits required artifacts", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-200",
                  agent_role: "architect",
                  status: "completed",
                  summary: "Missing artifacts should fail",
                  next_action: "handoff_to_quant"
                })
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
  });

  await assert.rejects(Promise.resolve(handler(createContext())), OrchestratorExecutionError);
});

test("fails when status is needs_escalation but escalation object is missing", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-200",
                  agent_role: "architect",
                  status: "needs_escalation",
                  summary: "Contract conflict between modules",
                  artifacts: ["adr-draft", "architecture-design"],
                  next_action: "request_more_context"
                })
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
  });

  await assert.rejects(Promise.resolve(handler(createContext())), OrchestratorExecutionError);
});

test("accepts needs_escalation only when escalation object is present", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-200",
                  agent_role: "architect",
                  status: "needs_escalation",
                  summary: "Contract conflict between modules",
                  artifacts: ["adr-draft", "architecture-design"],
                  next_action: "request_more_context",
                  escalation: {
                    task_id: "task-200",
                    agent_role: "architect_agent",
                    workflow_state: "DESIGN",
                    severity: "HIGH",
                    reason: "Module contract mismatch",
                    risk_notes: ["Boundary ambiguity blocks formalization"],
                    requested_decision: "resolve_contract_owner"
                  }
                })
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
  });

  const output = await handler(createContext());

  assert.equal(output.status, "needs_escalation");
  assert.equal((output.escalation as { severity?: string }).severity, "high");
  assert.equal((output.escalation as { agentRole?: string }).agentRole, "ARCHITECT");
});

test("fails on invalid JSON output from OpenAI", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "not-json"
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
  });

  await assert.rejects(Promise.resolve(handler(createContext())), OrchestratorExecutionError);
});

test("fails on OpenAI non-200 response", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiArchitectAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () => new Response("provider-error", { status: 500 })
  });

  await assert.rejects(Promise.resolve(handler(createContext())), OrchestratorExecutionError);
});

test("requires OPENAI_API_KEY when key is not provided explicitly", async () => {
  const promptsRootDir = await createPromptFixtureDir();
  const originalKey = process.env.OPENAI_API_KEY;

  delete process.env.OPENAI_API_KEY;
  try {
    assert.throws(
      () =>
        createOpenAiArchitectAgentHandler({
          promptsRootDir,
          fetchImpl: async () => new Response("{}", { status: 200 })
        }),
      OrchestratorExecutionError
    );
  } finally {
    if (originalKey !== undefined) {
      process.env.OPENAI_API_KEY = originalKey;
    }
  }
});
