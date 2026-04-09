import * as assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { parseArgs, runWithArgv } from "../src/index.js";
import type { RunnerOutput } from "../src/types.js";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TEST_DIR, "../../..");

async function createRunnerWorkspace(): Promise<string> {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "orchestrator-runner-"));
  await cp(join(REPO_ROOT, "configs"), join(workspaceRoot, "configs"), { recursive: true });
  return workspaceRoot;
}

function createLiveProductResponseContent(
  taskId: string,
  overrides: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    taskId,
    agentRole: "PRODUCT",
    status: "completed",
    summary: "Product scope prepared",
    artifacts: ["product-brief"],
    nextAction: "handoff_to_architect",
    metrics: {
      problemStatement: "Need actionable BTC entry/exit signal detection.",
      scope: "Define first signal intake for spot-only BTC strategy.",
      assumptions: ["Initial release uses spot-only data."],
      acceptanceCriteria: ["Intake scope is bounded and testable."],
      backlogItem: "MON-101 Product intake definition"
    },
    ...overrides
  });
}

function createChatCompletionFetch(content: string): typeof fetch {
  return async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content
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

async function readJsonFile<T>(pathValue: string): Promise<T> {
  const raw = await readFile(pathValue, "utf8");
  return JSON.parse(raw) as T;
}

function resolveArtifactsDir(workspaceRoot: string, result: RunnerOutput): string {
  const relative = result.artifactsPath;
  if (!relative) {
    throw new Error("Expected artifactsPath on runner output");
  }
  return join(workspaceRoot, relative);
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
  assert.equal(result.outcome, "success");
  assert.equal(typeof result.runId, "string");

  const artifactsDir = resolveArtifactsDir(workspaceRoot, result);
  const runRecord = await readJsonFile<{
    finalState: string;
    outcome: string;
    taskId: string;
  }>(join(artifactsDir, "run.json"));
  const transitions = await readJsonFile<Array<{ index: number; from: string; to: string }>>(
    join(artifactsDir, "transitions.json")
  );
  const terminalOutcome = await readJsonFile<{
    finalState: string;
    outcome: string;
    transitionCount: number;
    artifactSummary: string[];
  }>(join(artifactsDir, "terminal-outcome.json"));

  assert.equal(runRecord.taskId, "task-mock-happy");
  assert.equal(runRecord.finalState, "DONE");
  assert.equal(runRecord.outcome, "success");
  assert.equal(terminalOutcome.finalState, "DONE");
  assert.equal(terminalOutcome.outcome, "success");
  assert.equal(terminalOutcome.transitionCount, transitions.length);
  assert.ok(Array.isArray(terminalOutcome.artifactSummary));
  for (let index = 0; index < transitions.length; index += 1) {
    assert.equal(transitions[index]?.index, index + 1);
  }
  assert.equal(transitions[0]?.from, "INTAKE");
  assert.equal(transitions[0]?.to, "DESIGN");
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
  assert.equal(result.outcome, "policy_rejection");

  const artifactsDir = resolveArtifactsDir(workspaceRoot, result);
  const runRecord = await readJsonFile<{ finalState: string; outcome: string }>(
    join(artifactsDir, "run.json")
  );
  const transitions = await readJsonFile<Array<{ blocked?: boolean; from: string; to: string }>>(
    join(artifactsDir, "transitions.json")
  );
  const terminalOutcome = await readJsonFile<{
    finalState: string;
    outcome: string;
    rejectionCode?: string;
    reason?: string;
  }>(join(artifactsDir, "terminal-outcome.json"));

  assert.equal(runRecord.finalState, "REJECTED");
  assert.equal(runRecord.outcome, "policy_rejection");
  assert.equal(terminalOutcome.finalState, "REJECTED");
  assert.equal(terminalOutcome.outcome, "policy_rejection");
  assert.equal(terminalOutcome.rejectionCode, "MISSING_APPROVAL");
  assert.match(terminalOutcome.reason ?? "", /approval reference/);
  assert.ok(transitions.some((item) => item.blocked === true));
  const blocked = transitions.find((item) => item.blocked === true);
  assert.equal(blocked?.from, "DESIGN");
  assert.equal(blocked?.to, "FORMALIZE");
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

test("live mode runs Product Agent live with remaining agents mocked and reaches DONE", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const calls: Array<{ body?: Record<string, unknown> }> = [];
    const result = await runWithArgv(
      [
        "--mode",
        "live",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-live-valid",
        "--requested-by",
        "tester",
        "--task-title",
        "Live Product hybrid test"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: async (_url, init) => {
          calls.push({
            body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined
          });

          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: createLiveProductResponseContent("task-live-valid")
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
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.taskState, "DONE");
    assert.equal(result.outcome, "success");
    assert.equal(result.transitions.length, 7);
    assert.equal(result.transitions[0]?.from, "INTAKE");
    assert.equal(result.transitions[0]?.to, "DESIGN");
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.body?.response_format && typeof calls[0]?.body?.response_format, "object");

    const artifactsDir = resolveArtifactsDir(workspaceRoot, result);
    const runRecord = await readJsonFile<{ mode: string; finalState: string }>(
      join(artifactsDir, "run.json")
    );
    assert.equal(runRecord.mode, "live");
    assert.equal(runRecord.finalState, "DONE");
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("live mode rejects invalid non-JSON Product output", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
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
          "task-live-invalid-json"
        ],
        workspaceRoot,
        {
          liveProductFetchImpl: createChatCompletionFetch("not-json")
        }
      ),
      /Failed to parse OpenAI JSON output/
    );
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("live mode rejects Product output missing required field", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
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
          "task-live-missing-summary"
        ],
        workspaceRoot,
        {
          liveProductFetchImpl: createChatCompletionFetch(
            createLiveProductResponseContent("task-live-missing-summary", {
              summary: undefined
            })
          )
        }
      ),
      /Schema validation failed for live product agent output/
    );
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("live mode rejects Product output with wrong agentRole", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
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
          "task-live-wrong-role"
        ],
        workspaceRoot,
        {
          liveProductFetchImpl: createChatCompletionFetch(
            createLiveProductResponseContent("task-live-wrong-role", {
              agentRole: "ARCHITECT"
            })
          )
        }
      ),
      /Live Product Agent role must be 'PRODUCT'/
    );
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("live mode rejects Product output with unsupported nextAction", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
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
          "task-live-bad-action"
        ],
        workspaceRoot,
        {
          liveProductFetchImpl: createChatCompletionFetch(
            createLiveProductResponseContent("task-live-bad-action", {
              nextAction: "handoff_to_unknown_agent"
            })
          )
        }
      ),
      /Schema validation failed for live product agent output/
    );
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
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
