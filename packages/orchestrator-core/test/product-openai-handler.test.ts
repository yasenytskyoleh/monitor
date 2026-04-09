import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import type { RuntimeConfigSnapshot } from "@monitor/agent-config";

import { OrchestratorExecutionError } from "../src/errors.js";
import { createOpenAiProductAgentHandler } from "../src/handlers/product-openai.js";
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
    states: ["INTAKE", "DESIGN"],
    initialState: "INTAKE",
    terminalStates: ["DESIGN"],
    stateOwners: {
      INTAKE: "PRODUCT",
      DESIGN: "ARCHITECT"
    },
    transitions: [{ from: "INTAKE", to: "DESIGN" }]
  },
  agents: [
    {
      id: "product-agent",
      role: "PRODUCT",
      ownsStates: ["INTAKE"],
      allowedInputs: ["feature-request"],
      requiredOutputs: ["scope"],
      allowedNextActions: ["handoff_to_architect"],
      permissions: {
        allow: ["docs.read", "workflow.escalate"]
      },
      requiredArtifacts: ["product-brief"],
      outputContractSchemaRef: "agent-output-envelope.v1",
      escalationPolicy: {
        allowed: true,
        severities: ["low", "medium", "high", "critical"]
      },
      prompt: {
        version: "v1",
        template: "product-agent.txt"
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
  const root = await mkdtemp(join(tmpdir(), "product-openai-handler-"));
  await mkdir(join(root, "v1"), { recursive: true });
  await writeFile(
    join(root, "v1", "product-agent.txt"),
    "You are the Product Agent. Return a valid output envelope.",
    "utf8"
  );
  return root;
}

function createContext(): AgentHandlerContext {
  const agent = SNAPSHOT.agents[0];
  if (!agent) {
    throw new Error("Missing product agent fixture");
  }

  return {
    task: {
      taskId: "task-100",
      requestedBy: "tester",
      workflowState: "INTAKE",
      input: { title: "Test" },
      configVersion: "v1",
      artifactRefs: []
    },
    targetState: "DESIGN",
    snapshot: SNAPSHOT,
    agent
  };
}

test("calls OpenAI and parses Product Agent envelope JSON", async () => {
  const promptsRootDir = await createPromptFixtureDir();
  let capturedBody: unknown;

  const handler = createOpenAiProductAgentHandler({
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
                  taskId: "task-100",
                  agentRole: "PRODUCT",
                  status: "completed",
                  summary: "Structured scope generated",
                  artifacts: ["product-brief"],
                  nextAction: "handoff_to_architect"
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

  assert.equal(output.taskId, "task-100");
  assert.equal(output.agentRole, "PRODUCT");
  assert.equal(output.status, "completed");
  assert.deepEqual(output.artifacts, ["product-brief"]);
  assert.equal(output.nextAction, "handoff_to_architect");
  assert.equal((capturedBody as { model: string }).model, "gpt-5.4-mini");
});

test("normalizes common snake_case fields and ignores unsupported top-level fields", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-100",
                  agent_role: "product_agent",
                  status: "completed",
                  summary: "Structured scope generated",
                  artifacts: ["product-brief"],
                  next_action: "handoff_to_architect",
                  scope: "extra field that should not break envelope validation",
                  assumptions: ["market regime is unknown"]
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

  assert.equal(output.taskId, "task-100");
  assert.equal(output.agentRole, "PRODUCT");
  assert.equal(output.nextAction, "handoff_to_architect");
  assert.equal(output.summary, "Structured scope generated");
});

test("accepts summary alias fields when summary is missing", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-100",
                  agent_role: "product_agent",
                  status: "completed",
                  analysis: "Scope validated with core constraints.",
                  artifacts: ["product-brief"],
                  next_action: "handoff_to_architect"
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

  assert.equal(output.summary, "Scope validated with core constraints.");
});

test("synthesizes summary when model omits all summary-like fields", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-100",
                  agent_role: "product_agent",
                  status: "completed",
                  artifacts: ["product-brief"],
                  next_action: "handoff_to_architect"
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
    "Auto-generated summary: status=completed; nextAction=handoff_to_architect."
  );
});

test("normalizes object-shaped artifacts into string artifact refs", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-100",
                  agent_role: "product_agent",
                  status: "completed",
                  summary: "Artifact object normalization",
                  artifacts: [{ name: "product-brief" }, { id: "scope-v1" }, { value: "criteria-v1" }],
                  next_action: "handoff_to_architect"
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

  assert.deepEqual(output.artifacts, ["product-brief", "scope-v1", "criteria-v1"]);
});

test("normalizes object-map artifacts into string artifact refs", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-100",
                  agent_role: "product_agent",
                  status: "completed",
                  summary: "Artifact map normalization",
                  artifacts: {
                    "product-brief": true,
                    "scope-v1": "ready"
                  },
                  next_action: "handoff_to_architect"
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

  assert.deepEqual(output.artifacts, ["product-brief", "scope-v1"]);
});

test("adds target-state required artifacts when model output omits them", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-100",
                  agent_role: "product_agent",
                  status: "completed",
                  summary: "Model omitted mandatory target artifact.",
                  artifacts: ["scope-v1"],
                  next_action: "handoff_to_architect"
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
        DESIGN: ["product-brief"]
      }
    }
  };

  const output = await handler(context);

  assert.deepEqual(output.artifacts, ["scope-v1", "product-brief"]);
});

test("retries once with repair prompt when first output fails strict parsing", async () => {
  const promptsRootDir = await createPromptFixtureDir();
  let callCount = 0;

  const handler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () => {
      callCount += 1;

      const content =
        callCount === 1
          ? {
              task_id: "task-100",
              agent_role: "product_agent",
              status: "completed",
              summary: "First pass invalid artifacts",
              artifacts: [],
              next_action: "handoff_to_architect"
            }
          : {
              task_id: "task-100",
              agent_role: "product_agent",
              status: "completed",
              summary: "Repaired output",
              artifacts: ["product-brief"],
              next_action: "handoff_to_architect"
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
  assert.deepEqual(output.artifacts, ["product-brief"]);
});

test("fails when OpenAI omits required artifacts", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-100",
                  agent_role: "product",
                  status: "completed",
                  summary: "Missing artifacts should fail",
                  next_action: "handoff_to_architect"
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

  const handler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-100",
                  agent_role: "product",
                  status: "needs_escalation",
                  summary: "Business scope conflict",
                  artifacts: ["product-brief"],
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

  const handler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  task_id: "task-100",
                  agent_role: "product",
                  status: "needs_escalation",
                  summary: "Business scope conflict",
                  artifacts: ["product-brief"],
                  next_action: "request_more_context",
                  escalation: {
                    task_id: "task-100",
                    agent_role: "product_agent",
                    workflow_state: "INTAKE",
                    severity: "HIGH",
                    reason: "Conflicting business constraints",
                    risk_notes: ["Cannot define bounded scope"],
                    requested_decision: "prioritize_strategy"
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
  assert.equal((output.escalation as { agentRole?: string }).agentRole, "PRODUCT");
});

test("fails on invalid JSON output from OpenAI", async () => {
  const promptsRootDir = await createPromptFixtureDir();

  const handler = createOpenAiProductAgentHandler({
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

  const handler = createOpenAiProductAgentHandler({
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
        createOpenAiProductAgentHandler({
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
