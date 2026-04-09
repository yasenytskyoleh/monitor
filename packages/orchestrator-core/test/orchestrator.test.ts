import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { WorkflowTransitionError } from "@monitor/agent-config";
import type { ApprovalReference } from "@monitor/agent-config";

import { createOpenAiArchitectAgentHandler } from "../src/handlers/architect-openai.js";
import { createOpenAiProductAgentHandler } from "../src/handlers/product-openai.js";
import { OrchestratorCore } from "../src/orchestrator.js";
import type { AgentHandlers, TaskEnvelope } from "../src/types.js";
import { cleanupTempWorkspace, compileLocalSnapshot, createTempWorkspace } from "./helpers.js";

const ARCHITECTURE_APPROVAL: ApprovalReference = {
  approvalId: "appr-arch-001",
  approvalType: "ARCHITECTURE",
  approvedBy: "human-reviewer",
  approvedAtUtc: "2026-04-08T10:00:00.000Z",
  status: "approved"
};

const SIGNAL_PUBLISH_APPROVAL: ApprovalReference = {
  approvalId: "appr-signal-001",
  approvalType: "SIGNAL_PUBLISH",
  approvedBy: "human-reviewer",
  approvedAtUtc: "2026-04-08T10:30:00.000Z",
  status: "approved"
};

test("runs full mocked workflow from INTAKE to DONE", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  const snapshotPath = await compileLocalSnapshot(workspaceRoot, "v1");
  const transitionLogPath = join(workspaceRoot, "runtime", "transition-log.jsonl");
  const handlerCalls: string[] = [];

  const handlers: AgentHandlers = {
    "product-agent": async () => {
      handlerCalls.push("product-agent");
      return {
        taskId: "task-001",
        agentRole: "PRODUCT",
        status: "completed",
        summary: "Product scope is ready",
        artifacts: ["product-brief"],
        nextAction: "handoff_to_architect"
      };
    },
    "architect-agent": async () => {
      handlerCalls.push("architect-agent");
      return {
        taskId: "task-001",
        agentRole: "ARCHITECT",
        status: "completed",
        summary: "Architecture approved",
        artifacts: ["adr-draft", "architecture-design"],
        nextAction: "handoff_to_quant"
      };
    },
    "quant-pattern-agent": async () => {
      handlerCalls.push("quant-pattern-agent");
      return {
        taskId: "task-001",
        agentRole: "QUANT_PATTERN",
        status: "completed",
        summary: "Pattern is formalized",
        artifacts: ["pattern-definition", "metrics-plan"],
        nextAction: "handoff_to_backend"
      };
    },
    "backend-agent": async () => {
      handlerCalls.push("backend-agent");
      return {
        taskId: "task-001",
        agentRole: "BACKEND",
        status: "completed",
        summary: "Implementation is complete",
        artifacts: ["code-change", "implementation-notes", "tests"],
        nextAction: "handoff_to_docs_reviewer"
      };
    },
    "docs-reviewer-agent": async () => {
      handlerCalls.push("docs-reviewer-agent");
      return {
        taskId: "task-001",
        agentRole: "DOCS_REVIEWER",
        status: "completed",
        summary: "Docs and review are complete",
        artifacts: ["review-report", "docs-update"],
        nextAction: "await_approval"
      };
    }
  };

  const orchestrator = await OrchestratorCore.fromSnapshotFile({
    snapshotPath,
    handlers,
    transitionLogPath
  });

  let task: TaskEnvelope = {
    taskId: "task-001",
    requestedBy: "tester",
    workflowState: "INTAKE",
    input: {
      title: "Mocked workflow run"
    },
    configVersion: "v1",
    artifactRefs: []
  };

  task = (await orchestrator.transition({ task, to: "DESIGN" })).task;
  task = (await orchestrator.transition({ task, to: "FORMALIZE", approvalRef: ARCHITECTURE_APPROVAL })).task;
  task = (await orchestrator.transition({ task, to: "IMPLEMENT" })).task;
  task = (await orchestrator.transition({ task, to: "REVIEW" })).task;
  task = (await orchestrator.transition({ task, to: "APPROVAL" })).task;
  task = (
    await orchestrator.transition({
      task,
      to: "PUBLISH_SIGNAL",
      approvalRef: SIGNAL_PUBLISH_APPROVAL,
      additionalArtifacts: ["publishable-signal-bundle"]
    })
  ).task;
  task = (await orchestrator.transition({ task, to: "DONE" })).task;

  assert.equal(task.workflowState, "DONE");
  assert.deepEqual(handlerCalls, [
    "product-agent",
    "architect-agent",
    "quant-pattern-agent",
    "backend-agent",
    "docs-reviewer-agent"
  ]);

  const rawLog = await readFile(transitionLogPath, "utf8");
  const records = rawLog
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { from: string; to: string; approvalRef?: { approvalType: string } });

  assert.equal(records.length, 7);
  assert.deepEqual(
    records.map((record) => `${record.from}->${record.to}`),
    [
      "INTAKE->DESIGN",
      "DESIGN->FORMALIZE",
      "FORMALIZE->IMPLEMENT",
      "IMPLEMENT->REVIEW",
      "REVIEW->APPROVAL",
      "APPROVAL->PUBLISH_SIGNAL",
      "PUBLISH_SIGNAL->DONE"
    ]
  );
  assert.equal(records[1]?.approvalRef?.approvalType, "ARCHITECTURE");
  assert.equal(records[5]?.approvalRef?.approvalType, "SIGNAL_PUBLISH");
});

test("blocks approval-gated transitions without approval and skips handler execution", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  const snapshotPath = await compileLocalSnapshot(workspaceRoot, "v1");
  let architectHandlerCalls = 0;

  const orchestrator = await OrchestratorCore.fromSnapshotFile({
    snapshotPath,
    handlers: {
      "architect-agent": async () => {
        architectHandlerCalls += 1;
        return {
          taskId: "task-002",
          agentRole: "ARCHITECT",
          status: "completed",
          summary: "Should not run for missing approval path",
          artifacts: ["adr-draft", "architecture-design"],
          nextAction: "handoff_to_quant"
        };
      }
    }
  });

  const task: TaskEnvelope = {
    taskId: "task-002",
    requestedBy: "tester",
    workflowState: "DESIGN",
    input: {
      title: "Missing approval path"
    },
    configVersion: "v1",
    artifactRefs: ["product-brief"]
  };

  await assert.rejects(orchestrator.transition({ task, to: "FORMALIZE" }), WorkflowTransitionError);
  assert.equal(architectHandlerCalls, 0);
});

test("supports real OpenAI-backed Product Agent handler for INTAKE -> DESIGN", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  const snapshotPath = await compileLocalSnapshot(workspaceRoot, "v1");
  let fetchCalled = 0;

  const productHandler = createOpenAiProductAgentHandler({
    apiKey: "test-key",
    promptsRootDir: join(workspaceRoot, "configs/agents/prompts"),
    fetchImpl: async () => {
      fetchCalled += 1;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  taskId: "task-003",
                  agentRole: "PRODUCT",
                  status: "completed",
                  summary: "Product output from OpenAI handler",
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

  const orchestrator = await OrchestratorCore.fromSnapshotFile({
    snapshotPath,
    handlers: {
      "product-agent": productHandler
    }
  });

  const task: TaskEnvelope = {
    taskId: "task-003",
    requestedBy: "tester",
    workflowState: "INTAKE",
    input: {
      title: "Use OpenAI product handler"
    },
    configVersion: "v1",
    artifactRefs: []
  };

  const result = await orchestrator.transition({
    task,
    to: "DESIGN"
  });

  assert.equal(fetchCalled, 1);
  assert.equal(result.task.workflowState, "DESIGN");
  assert.ok(result.task.artifactRefs.includes("product-brief"));
  assert.equal(result.output?.agentRole, "PRODUCT");
});

test("supports Product + Architect OpenAI handlers for INTAKE -> FORMALIZE with approval", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  const snapshotPath = await compileLocalSnapshot(workspaceRoot, "v1");
  let fetchCalled = 0;

  const fetchImpl: typeof fetch = async () => {
    fetchCalled += 1;
    const content =
      fetchCalled === 1
        ? {
            taskId: "task-004",
            agentRole: "PRODUCT",
            status: "completed",
            summary: "Product output from OpenAI handler",
            artifacts: ["product-brief"],
            nextAction: "handoff_to_architect"
          }
        : {
            taskId: "task-004",
            agentRole: "ARCHITECT",
            status: "completed",
            summary: "Architecture output from OpenAI handler",
            artifacts: ["adr-draft", "architecture-design"],
            nextAction: "handoff_to_quant"
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
  };

  const orchestrator = await OrchestratorCore.fromSnapshotFile({
    snapshotPath,
    handlers: {
      "product-agent": createOpenAiProductAgentHandler({
        apiKey: "test-key",
        promptsRootDir: join(workspaceRoot, "configs/agents/prompts"),
        fetchImpl
      }),
      "architect-agent": createOpenAiArchitectAgentHandler({
        apiKey: "test-key",
        promptsRootDir: join(workspaceRoot, "configs/agents/prompts"),
        fetchImpl
      })
    }
  });

  let task: TaskEnvelope = {
    taskId: "task-004",
    requestedBy: "tester",
    workflowState: "INTAKE",
    input: {
      title: "Use OpenAI product + architect handlers"
    },
    configVersion: "v1",
    artifactRefs: []
  };

  task = (await orchestrator.transition({ task, to: "DESIGN" })).task;
  task = (
    await orchestrator.transition({
      task,
      to: "FORMALIZE",
      approvalRef: ARCHITECTURE_APPROVAL
    })
  ).task;

  assert.equal(fetchCalled, 2);
  assert.equal(task.workflowState, "FORMALIZE");
  assert.ok(task.artifactRefs.includes("product-brief"));
  assert.ok(task.artifactRefs.includes("adr-draft"));
  assert.ok(task.artifactRefs.includes("architecture-design"));
});
