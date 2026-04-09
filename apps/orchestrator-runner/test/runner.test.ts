import * as assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { parseArgs, runWithArgv } from "../src/index.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "../../..");

async function createRunnerWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "orchestrator-runner-"));
  await cp(join(REPO_ROOT, "configs"), join(workspaceRoot, "configs"), { recursive: true });
  return workspaceRoot;
}

test("parseArgs defaults to live mode", () => {
  const args = parseArgs([]);

  assert.equal(args.mode, "live");
  assert.equal(args.environment, "local");
  assert.equal(args.targetState, "DESIGN");
  assert.equal(args.scenario, undefined);
});

test("parseArgs validates mode and scenario values", () => {
  const mockDefault = parseArgs(["--mode", "mock"]);
  assert.equal(mockDefault.mode, "mock");
  assert.equal(mockDefault.scenario, "both");

  const mockHappy = parseArgs(["--mode", "mock", "--scenario", "happy"]);
  assert.equal(mockHappy.scenario, "happy");

  assert.throws(() => parseArgs(["--mode", "invalid"]), /Invalid --mode/);
  assert.throws(() => parseArgs(["--scenario", "invalid"]), /Invalid --scenario/);
});

test("mock happy scenario reaches DONE", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const result = await runWithArgv(
    [
      "--mode",
      "mock",
      "--scenario",
      "happy",
      "--env",
      "local",
      "--version",
      "v1",
      "--task-id",
      "task-mock-happy",
      "--requested-by",
      "tester",
      "--task-title",
      "Mock happy flow"
    ],
    workspaceRoot
  );

  assert.equal(result.status, "ok");
  assert.equal(result.taskState, "DONE");
  assert.equal(result.scenarios?.length, 1);
  assert.equal(result.scenarios?.[0]?.scenario, "happy");
  assert.equal(result.scenarios?.[0]?.finalState, "DONE");
  assert.match(result.scenarios?.[0]?.transitionLogPath ?? "", /-happy/);
});

test("mock missing-approval scenario reaches REJECTED and captures blocked transition", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const result = await runWithArgv(
    [
      "--mode",
      "mock",
      "--scenario",
      "missing-approval",
      "--env",
      "local",
      "--version",
      "v1",
      "--task-id",
      "task-mock-missing-approval",
      "--requested-by",
      "tester",
      "--task-title",
      "Mock rejection flow"
    ],
    workspaceRoot
  );

  assert.equal(result.status, "ok");
  assert.equal(result.taskState, "REJECTED");
  assert.equal(result.scenarios?.length, 1);

  const scenario = result.scenarios?.[0];
  assert.equal(scenario?.scenario, "missing-approval");
  assert.equal(scenario?.finalState, "REJECTED");
  assert.match(scenario?.transitionLogPath ?? "", /-missing-approval/);
  assert.equal(scenario?.blockedTransition?.from, "DESIGN");
  assert.equal(scenario?.blockedTransition?.to, "FORMALIZE");
  assert.match(scenario?.blockedTransition?.error ?? "", /requires an approval reference/);
});

test("mock both scenario runs happy and rejection flows", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const result = await runWithArgv(
    [
      "--mode",
      "mock",
      "--scenario",
      "both",
      "--env",
      "local",
      "--version",
      "v1",
      "--task-id",
      "task-mock-both",
      "--requested-by",
      "tester",
      "--task-title",
      "Mock both flows"
    ],
    workspaceRoot
  );

  assert.equal(result.status, "ok");
  assert.equal(result.scenarios?.length, 2);
  assert.equal(result.scenarios?.[0]?.scenario, "happy");
  assert.equal(result.scenarios?.[0]?.finalState, "DONE");
  assert.equal(result.scenarios?.[1]?.scenario, "missing-approval");
  assert.equal(result.scenarios?.[1]?.finalState, "REJECTED");
});

test("live mode is explicitly not implemented for this milestone", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  await assert.rejects(
    runWithArgv(
      [
        "--mode",
        "live",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-live-stub"
      ],
      workspaceRoot
    ),
    /Mode 'live' is not implemented/
  );
});

test("fails with system error when required transition is removed from workflow config", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const workflowPath = join(workspaceRoot, "configs", "agents", "base", "workflow.yaml");
  const originalWorkflow = await readFile(workflowPath, "utf8");
  const brokenWorkflow = originalWorkflow.replace("  - from: INTAKE\n    to: DESIGN\n", "");
  await writeFile(workflowPath, brokenWorkflow, "utf8");

  await assert.rejects(
    runWithArgv(
      [
        "--mode",
        "mock",
        "--scenario",
        "happy",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-mock-invalid-transition"
      ],
      workspaceRoot
    ),
    /Semantic validation failed/
  );
});

test("fails when state owner has no configured matching agent role", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const workflowPath = join(workspaceRoot, "configs", "agents", "base", "workflow.yaml");
  const originalWorkflow = await readFile(workflowPath, "utf8");
  const brokenWorkflow = originalWorkflow.replace("INTAKE: PRODUCT", "INTAKE: UNKNOWN_ROLE");
  await writeFile(workflowPath, brokenWorkflow, "utf8");

  await assert.rejects(
    runWithArgv(
      [
        "--mode",
        "mock",
        "--scenario",
        "happy",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-mock-owner-mismatch"
      ],
      workspaceRoot
    ),
    /Schema validation failed for base workflow config/
  );
});
