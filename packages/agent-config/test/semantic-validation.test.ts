import assert from "node:assert/strict";
import test from "node:test";
import { join } from "node:path";

import { compileRuntimeConfig } from "../src/compiler.js";
import { ConfigSemanticError, ConfigValidationError } from "../src/errors.js";
import { cleanupTempWorkspace, createTempWorkspace, updateYamlFile } from "./helpers.js";

function hasSemanticDetail(error: unknown, expectedSubstring: string): boolean {
  if (!(error instanceof ConfigSemanticError)) {
    return false;
  }

  return error.details.some((detail) => detail.includes(expectedSubstring));
}

test("rejects duplicate agent ids", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{ agents: Array<{ id: string }> }>(
    join(workspaceRoot, "configs/agents/base/agents.yaml"),
    (config) => {
      config.agents[1]!.id = config.agents[0]!.id;
      return config;
    }
  );

  await assert.rejects(compileRuntimeConfig({ rootDir: workspaceRoot, environment: "dev" }), (error: unknown) =>
    hasSemanticDetail(error, "Duplicate agent id")
  );
});

test("rejects unknown permission keys", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{ agents: Array<{ permissions: { allowedActions: string[] } }> }>(
    join(workspaceRoot, "configs/agents/base/agents.yaml"),
    (config) => {
      config.agents[0]!.permissions.allowedActions.push("nonexistent.permission");
      return config;
    }
  );

  await assert.rejects(compileRuntimeConfig({ rootDir: workspaceRoot, environment: "dev" }), (error: unknown) =>
    hasSemanticDetail(error, "Unknown permission action")
  );
});

test("rejects missing prompt references", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{ agents: Array<{ prompt: { file: string } }> }>(
    join(workspaceRoot, "configs/agents/base/agents.yaml"),
    (config) => {
      config.agents[0]!.prompt.file = "missing-prompt.txt";
      return config;
    }
  );

  await assert.rejects(compileRuntimeConfig({ rootDir: workspaceRoot, environment: "dev" }), (error: unknown) =>
    hasSemanticDetail(error, "Missing prompt template") ||
    (error instanceof ConfigValidationError && error.message.includes("Prompt manifest validation failed"))
  );
});

test("rejects transitions to undefined states", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{ workflow: { transitions: Array<{ from: string; to: string }> } }>(
    join(workspaceRoot, "configs/agents/base/workflow.yaml"),
    (config) => {
      config.workflow.transitions.push({ from: "DESIGN", to: "UNKNOWN_STATE" });
      return config;
    }
  );

  await assert.rejects(compileRuntimeConfig({ rootDir: workspaceRoot, environment: "dev" }), (error: unknown) =>
    hasSemanticDetail(error, "undefined 'to' state")
  );
});

test("rejects unreachable states", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{ workflow: { states: string[] } }>(
    join(workspaceRoot, "configs/agents/base/workflow.yaml"),
    (config) => {
      config.workflow.states.push("ORPHAN");
      return config;
    }
  );

  await assert.rejects(compileRuntimeConfig({ rootDir: workspaceRoot, environment: "dev" }), (error: unknown) =>
    hasSemanticDetail(error, "Unreachable workflow state")
  );
});

test("rejects terminal outbound transitions", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{ workflow: { transitions: Array<{ from: string; to: string }> } }>(
    join(workspaceRoot, "configs/agents/base/workflow.yaml"),
    (config) => {
      config.workflow.transitions.push({ from: "DONE", to: "INTAKE" });
      return config;
    }
  );

  await assert.rejects(compileRuntimeConfig({ rootDir: workspaceRoot, environment: "dev" }), (error: unknown) =>
    hasSemanticDetail(error, "cannot have outbound transitions")
  );
});

test("rejects missing state owner mappings", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{ workflow: { stateOwners: Record<string, string> } }>(
    join(workspaceRoot, "configs/agents/base/workflow.yaml"),
    (config) => {
      delete config.workflow.stateOwners.REVIEW;
      return config;
    }
  );

  await assert.rejects(compileRuntimeConfig({ rootDir: workspaceRoot, environment: "dev" }), (error: unknown) =>
    hasSemanticDetail(error, "missing an owner mapping")
  );
});

test("rejects approval rules that reference undefined transitions", async (context) => {
  const workspaceRoot = await createTempWorkspace();
  context.after(async () => cleanupTempWorkspace(workspaceRoot));

  await updateYamlFile<{
    workflow: {
      approvalRules: Array<{
        transition: { from: string; to: string };
        type: "ARCHITECTURE" | "SIGNAL_PUBLISH";
        required: boolean;
      }>;
    };
  }>(join(workspaceRoot, "configs/agents/base/workflow.yaml"), (config) => {
    config.workflow.approvalRules.push({
      transition: { from: "INTAKE", to: "PUBLISH_SIGNAL" },
      type: "ARCHITECTURE",
      required: true
    });
    return config;
  });

  await assert.rejects(
    compileRuntimeConfig({ rootDir: workspaceRoot, environment: "dev" }),
    (error: unknown) =>
      error instanceof ConfigValidationError &&
      error.message.includes("Approval rule references undefined transition")
  );
});
