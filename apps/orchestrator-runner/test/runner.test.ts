import * as assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { ConfigReleaseManager } from "@monitor/agent-config";
import { OrchestratorCore } from "@monitor/orchestrator-core";
import { parseArgs, runWithArgv } from "../src/index.js";
import { resolveHandlers } from "../src/handlers/resolve-handlers.js";
import { FileRunStore } from "../src/persistence/file-run-store.js";
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

function createLiveArchitectResponseContent(
  taskId: string,
  overrides: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    taskId,
    agentRole: "ARCHITECT",
    status: "completed",
    summary: "Architecture design completed",
    artifacts: ["architecture-design", "adr-draft"],
    nextAction: "handoff_to_quant",
    metrics: {
      moduleBoundaries: ["SignalOrchestrator", "IndicatorEvaluator"],
      dataFlow: ["market_tick -> features -> signal_decision"],
      contractDefinitions: ["SignalRequest v1", "SignalDecision v1"],
      adrDraft: "Adopt deterministic signal pipeline with explicit validation boundaries.",
      riskNotes: ["False positives in high volatility regime."]
    },
    ...overrides
  });
}

function createLiveQuantPatternResponseContent(
  taskId: string,
  overrides: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    taskId,
    agentRole: "QUANT_PATTERN",
    status: "completed",
    summary: "Pattern formalization completed",
    artifacts: ["pattern-definition", "metrics-plan"],
    nextAction: "handoff_to_backend",
    metrics: {
      patternDefinition: "Confirm trend continuation after pullback reclaim above 20 EMA.",
      measurableConditions: [
        "Price closes above 20 EMA on 15m chart for 3 consecutive candles.",
        "Volume exceeds 20-period average by 1.2x."
      ],
      metricsPlan: ["Win rate", "Profit factor", "Max drawdown"],
      evaluationHorizon: "30 trading days",
      invalidationAssumptions: ["Volatility regime shift above threshold invalidates edge."],
      edgeHypothesis: "Momentum continuation in spot BTC after reclaim yields positive expectancy.",
      testScenarios: ["Low volatility trend day", "High volatility breakout day"],
      phaseScope: {
        marketType: "SPOT_ONLY",
        leverage: "NONE",
        fundingRateDependency: "NOT_REQUIRED",
        derivatives: "NONE"
      }
    },
    ...overrides
  });
}

function createLiveDocsReviewerResponseContent(
  taskId: string,
  overrides: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    taskId,
    agentRole: "DOCS_REVIEWER",
    status: "completed",
    summary: "Review completed",
    artifacts: ["docs-update", "review-report"],
    nextAction: "await_approval",
    metrics: {
      docsUpdates: ["Update workflow artifact contract docs"],
      reviewFindings: ["Artifact traceability is complete for current run."],
      changelogNotes: ["Added strict artifact record enforcement."],
      traceabilityConfirmation: {
        isTraceable: true,
        notes: ["All required artifacts have canonical refs."]
      },
      missingArtifactWarnings: [],
      driftWarnings: []
    },
    ...overrides
  });
}

function createLiveBackendResponseContent(
  taskId: string,
  targetFile: string,
  overrides: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    taskId,
    agentRole: "BACKEND",
    status: "completed",
    summary: "Backend implementation patch prepared",
    artifacts: ["code-change", "tests", "implementation-notes"],
    nextAction: "handoff_to_docs_reviewer",
    metrics: {
      changePlan: ["Update backend target file with constrained patch content."],
      targetFiles: [targetFile],
      changeType: "patch_only",
      requiresSchemaChange: false,
      requiresArchitectureChange: false,
      requiresMigration: false,
      proposedDiffs: [
        {
          filePath: targetFile,
          operation: "update",
          content: `// patched by live backend for ${taskId}\nexport const backendPatched = true;\n`
        }
      ],
      testsPlan: ["pnpm --filter @monitor/orchestrator-runner test"],
      knownLimitations: ["Constrained patch mode only."]
    },
    ...overrides
  });
}

async function prepareBackendTargetFile(
  workspaceRoot: string,
  relativePath = "apps/orchestrator-runner/src/backend-live-target.ts"
): Promise<string> {
  const absolutePath = join(workspaceRoot, relativePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, "export const backendPatched = false;\n", "utf8");
  return relativePath;
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

function createChatCompletionSequenceFetch(
  contents: string[],
  calls: Array<{ body?: Record<string, unknown> }> = []
): typeof fetch {
  let index = 0;

  return async (_url, init) => {
    calls.push({
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined
    });

    const content = contents[index];
    index += 1;

    if (!content) {
      throw new Error(`Unexpected OpenAI call index ${index}`);
    }

    return new Response(
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
  };
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
  assert.equal(args.output, "text");
  assert.deepEqual(args.agentModeOverrides, {});
  assert.equal(args.environment, "local");
  assert.equal(args.scenario, undefined);
});

test("parseArgs validates mode and scenario values", () => {
  const mockDefault = parseArgs(["--mode", "mock"]);
  assert.equal(mockDefault.mode, "mock");
  assert.equal(mockDefault.scenario, "both");

  const mockHappy = parseArgs(["--mode", "mock", "--scenario", "happy"]);
  assert.equal(mockHappy.scenario, "happy");

  const jsonOutput = parseArgs(["--output", "json"]);
  assert.equal(jsonOutput.output, "json");

  const overrides = parseArgs(["--agent-mode", "product=live,architect=mock"]);
  assert.equal(overrides.agentModeOverrides["product-agent"], "live");
  assert.equal(overrides.agentModeOverrides["architect-agent"], "mock");

  assert.throws(() => parseArgs(["--mode", "invalid"]), /Invalid --mode/);
  assert.throws(() => parseArgs(["--scenario", "invalid"]), /Invalid --scenario/);
  assert.throws(() => parseArgs(["--output", "yaml"]), /Invalid --output/);
  assert.throws(() => parseArgs(["--agent-mode", "foo=live"]), /Invalid --agent-mode agent/);
  assert.throws(() => parseArgs(["--agent-mode", "product=weird"]), /Invalid --agent-mode value/);
  assert.throws(
    () => parseArgs(["--agent-mode", "product=live,product=mock"]),
    /Duplicate --agent-mode override/
  );
  assert.throws(() => parseArgs(["--agent-mode", "product"]), /Expected <agent>=<mock\|live>/);
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
    agentModes: Record<string, string>;
  }>(join(artifactsDir, "run.json"));
  const transitions = await readJsonFile<
    Array<{
      index: number;
      from: string;
      to: string;
      approvalType?: string;
      validationStatus?: string;
      evidenceSummary?: string;
    }>
  >(join(artifactsDir, "transitions.json"));
  const approvals = await readJsonFile<
    Array<{ approvalRef: string; approvalType: string; issuedFor: { from: string; to: string } }>
  >(join(artifactsDir, "approvals.json"));
  const terminalOutcome = await readJsonFile<{
    finalState: string;
    outcome: string;
    transitionCount: number;
    artifactSummary: string[];
  }>(join(artifactsDir, "terminal-outcome.json"));
  const artifactsInventory = await readJsonFile<
    Array<{ artifactType: string; producedBy: string; artifactRef: string }>
  >(join(artifactsDir, "artifacts.json"));

  assert.equal(runRecord.taskId, "task-mock-happy");
  assert.equal(runRecord.finalState, "DONE");
  assert.equal(runRecord.outcome, "success");
  assert.equal(runRecord.agentModes["product-agent"], "mock");
  assert.equal(runRecord.agentModes["architect-agent"], "mock");
  assert.equal(terminalOutcome.finalState, "DONE");
  assert.equal(terminalOutcome.outcome, "success");
  assert.equal(terminalOutcome.transitionCount, transitions.length);
  assert.ok(Array.isArray(terminalOutcome.artifactSummary));
  for (let index = 0; index < transitions.length; index += 1) {
    assert.equal(transitions[index]?.index, index + 1);
  }
  assert.equal(transitions[0]?.from, "INTAKE");
  assert.equal(transitions[0]?.to, "DESIGN");
  assert.ok(artifactsInventory.length > 0);
  assert.ok(artifactsInventory.some((artifact) => artifact.artifactType === "product-brief"));
  assert.ok(artifactsInventory.every((artifact) => artifact.artifactRef.length > 0));
  assert.equal(approvals.length, 2);
  assert.ok(approvals.some((approval) => approval.approvalType === "ARCHITECTURE"));
  assert.ok(
    approvals.some(
      (approval) =>
        approval.approvalType === "SIGNAL_PUBLISH" &&
        approval.issuedFor.from === "APPROVAL" &&
        approval.issuedFor.to === "PUBLISH_SIGNAL"
      )
  );
  const architectureTransition = transitions.find(
    (transition) => transition.from === "DESIGN" && transition.to === "FORMALIZE"
  );
  assert.equal(architectureTransition?.approvalType, "ARCHITECTURE");
  assert.equal(architectureTransition?.validationStatus, "approved");
  assert.match(architectureTransition?.evidenceSummary ?? "", /validated/i);
  const publishTransition = transitions.find(
    (transition) => transition.from === "APPROVAL" && transition.to === "PUBLISH_SIGNAL"
  );
  assert.equal(publishTransition?.approvalType, "SIGNAL_PUBLISH");
  assert.equal(publishTransition?.validationStatus, "approved");
  assert.match(publishTransition?.evidenceSummary ?? "", /validated/i);
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
  assert.match(scenario?.blockedTransition?.error ?? "", /missing required approval/i);
  assert.equal(result.outcome, "policy_rejection");

  const artifactsDir = resolveArtifactsDir(workspaceRoot, result);
  const runRecord = await readJsonFile<{
    finalState: string;
    outcome: string;
    agentModes: Record<string, string>;
  }>(
    join(artifactsDir, "run.json")
  );
  const transitions = await readJsonFile<
    Array<{ blocked?: boolean; from: string; to: string; validationStatus?: string; evidenceSummary?: string }>
  >(
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
  assert.equal(runRecord.agentModes["product-agent"], "mock");
  assert.equal(terminalOutcome.finalState, "REJECTED");
  assert.equal(terminalOutcome.outcome, "policy_rejection");
  assert.equal(terminalOutcome.rejectionCode, "MISSING_APPROVAL");
  assert.match(terminalOutcome.reason ?? "", /missing required approval/i);
  assert.ok(transitions.some((item) => item.blocked === true));
  const blocked = transitions.find((item) => item.blocked === true);
  assert.equal(blocked?.from, "DESIGN");
  assert.equal(blocked?.to, "FORMALIZE");
  assert.equal(blocked?.validationStatus, "blocked");
  assert.match(blocked?.evidenceSummary ?? "", /approval/i);
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

test("live mode runs Product, Architect, Quant Pattern, Backend, and Docs Reviewer live and reaches DONE", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const backendTargetFile = await prepareBackendTargetFile(workspaceRoot);
    const calls: Array<{ body?: Record<string, unknown> }> = [];
    const fetchImpl = createChatCompletionSequenceFetch(
      [
        createLiveProductResponseContent("task-live-valid"),
        createLiveArchitectResponseContent("task-live-valid"),
        createLiveQuantPatternResponseContent("task-live-valid"),
        createLiveBackendResponseContent("task-live-valid", backendTargetFile),
        createLiveDocsReviewerResponseContent("task-live-valid")
      ],
      calls
    );
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
        "Live Product + Architect + Quant + Docs Reviewer test"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: fetchImpl
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.taskState, "DONE");
    assert.equal(result.outcome, "success");
    assert.equal(result.transitions.length, 7);
    assert.equal(result.transitions[0]?.from, "INTAKE");
    assert.equal(result.transitions[0]?.to, "DESIGN");
    assert.equal(calls.length, 5);
    assert.equal(calls[0]?.body?.response_format && typeof calls[0]?.body?.response_format, "object");
    assert.equal(calls[1]?.body?.response_format && typeof calls[1]?.body?.response_format, "object");
    assert.equal(calls[2]?.body?.response_format && typeof calls[2]?.body?.response_format, "object");
    assert.equal(calls[3]?.body?.response_format && typeof calls[3]?.body?.response_format, "object");
    assert.equal(calls[4]?.body?.response_format && typeof calls[4]?.body?.response_format, "object");

    const artifactsDir = resolveArtifactsDir(workspaceRoot, result);
    const runRecord = await readJsonFile<{
      mode: string;
      finalState: string;
      agentModes: Record<string, string>;
    }>(
      join(artifactsDir, "run.json")
    );
    assert.equal(runRecord.mode, "live");
    assert.equal(runRecord.finalState, "DONE");
    assert.equal(runRecord.agentModes["product-agent"], "live");
    assert.equal(runRecord.agentModes["architect-agent"], "live");
    assert.equal(runRecord.agentModes["quant-pattern-agent"], "live");
    assert.equal(runRecord.agentModes["backend-agent"], "live");
    assert.equal(runRecord.agentModes["docs-reviewer-agent"], "live");

    const patchedFile = await readFile(join(workspaceRoot, backendTargetFile), "utf8");
    assert.match(patchedFile, /patched by live backend/);

    const patchPlan = await readJsonFile<Array<{ changeType: string; targetFiles: string[] }>>(
      join(artifactsDir, "patch-plan.json")
    );
    assert.ok(patchPlan.length > 0);
    assert.equal(patchPlan[0]?.changeType, "patch_only");
    assert.ok(patchPlan[0]?.targetFiles.includes(backendTargetFile));
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock with product live override runs mixed flow", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const result = await runWithArgv(
      [
        "--mode",
        "mock",
        "--agent-mode",
        "product=live",
        "--scenario",
        "happy",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-mock-product-live",
        "--requested-by",
        "tester",
        "--task-title",
        "Mixed mode test"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: createChatCompletionFetch(
          createLiveProductResponseContent("task-mock-product-live")
        )
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.taskState, "DONE");
    assert.equal(result.agentModes?.["product-agent"], "live");
    assert.equal(result.agentModes?.["architect-agent"], "mock");
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock with product and architect live overrides runs happy flow", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const calls: Array<{ body?: Record<string, unknown> }> = [];
    const result = await runWithArgv(
      [
        "--mode",
        "mock",
        "--agent-mode",
        "product=live,architect=live",
        "--scenario",
        "happy",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-mock-product-architect-live",
        "--requested-by",
        "tester",
        "--task-title",
        "Mixed product+architect live"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: createChatCompletionSequenceFetch(
          [
            createLiveProductResponseContent("task-mock-product-architect-live"),
            createLiveArchitectResponseContent("task-mock-product-architect-live")
          ],
          calls
        )
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.taskState, "DONE");
    assert.equal(result.agentModes?.["product-agent"], "live");
    assert.equal(result.agentModes?.["architect-agent"], "live");
    assert.equal(result.agentModes?.["quant-pattern-agent"], "mock");
    assert.equal(calls.length, 2);
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock rejects invalid live Architect output", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    await assert.rejects(
      runWithArgv(
        [
          "--mode",
          "mock",
          "--agent-mode",
          "architect=live",
          "--scenario",
          "happy",
          "--env",
          "local",
          "--version",
          "v1",
          "--task-id",
          "task-architect-invalid"
        ],
        workspaceRoot,
        {
          liveProductFetchImpl: createChatCompletionFetch(
            createLiveArchitectResponseContent("task-architect-invalid", {
              metrics: {
                dataFlow: ["x"],
                contractDefinitions: ["y"],
                adrDraft: "z",
                riskNotes: ["r"]
              }
            })
          )
        }
      ),
      /Schema validation failed for live architect agent output/
    );
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("missing-approval scenario still rejects when architect is live", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const result = await runWithArgv(
      [
        "--mode",
        "mock",
        "--agent-mode",
        "architect=live",
        "--scenario",
        "missing-approval",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-architect-live-missing-approval"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: createChatCompletionFetch(
          createLiveArchitectResponseContent("task-architect-live-missing-approval", {
            status: "rejected",
            summary: "Architecture approval missing",
            artifacts: ["adr-draft"],
            nextAction: "reject_task",
            metrics: undefined
          })
        )
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.taskState, "REJECTED");
    assert.equal(result.outcome, "policy_rejection");
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock with product, architect, and quant-pattern live overrides runs happy flow", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const calls: Array<{ body?: Record<string, unknown> }> = [];
    const result = await runWithArgv(
      [
        "--mode",
        "mock",
        "--agent-mode",
        "product=live,architect=live,quant-pattern=live",
        "--scenario",
        "happy",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-mock-product-architect-quant-live",
        "--requested-by",
        "tester",
        "--task-title",
        "Mixed product+architect+quant live"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: createChatCompletionSequenceFetch(
          [
            createLiveProductResponseContent("task-mock-product-architect-quant-live"),
            createLiveArchitectResponseContent("task-mock-product-architect-quant-live"),
            createLiveQuantPatternResponseContent("task-mock-product-architect-quant-live")
          ],
          calls
        )
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.taskState, "DONE");
    assert.equal(result.agentModes?.["product-agent"], "live");
    assert.equal(result.agentModes?.["architect-agent"], "live");
    assert.equal(result.agentModes?.["quant-pattern-agent"], "live");
    assert.equal(calls.length, 3);
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock with product, architect, quant-pattern, and docs-reviewer live overrides runs happy flow", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const calls: Array<{ body?: Record<string, unknown> }> = [];
    const result = await runWithArgv(
      [
        "--mode",
        "mock",
        "--agent-mode",
        "product=live,architect=live,quant-pattern=live,docs-reviewer=live",
        "--scenario",
        "happy",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-mock-product-architect-quant-docs-live",
        "--requested-by",
        "tester",
        "--task-title",
        "Mixed product+architect+quant+docs live"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: createChatCompletionSequenceFetch(
          [
            createLiveProductResponseContent("task-mock-product-architect-quant-docs-live"),
            createLiveArchitectResponseContent("task-mock-product-architect-quant-docs-live"),
            createLiveQuantPatternResponseContent("task-mock-product-architect-quant-docs-live"),
            createLiveDocsReviewerResponseContent("task-mock-product-architect-quant-docs-live")
          ],
          calls
        )
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.taskState, "DONE");
    assert.equal(result.agentModes?.["product-agent"], "live");
    assert.equal(result.agentModes?.["architect-agent"], "live");
    assert.equal(result.agentModes?.["quant-pattern-agent"], "live");
    assert.equal(result.agentModes?.["docs-reviewer-agent"], "live");
    assert.equal(calls.length, 4);
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock with quant-pattern live override runs happy flow", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const calls: Array<{ body?: Record<string, unknown> }> = [];
    const result = await runWithArgv(
      [
        "--mode",
        "mock",
        "--agent-mode",
        "quant-pattern=live",
        "--scenario",
        "happy",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-mock-quant-live",
        "--requested-by",
        "tester",
        "--task-title",
        "Quant live only"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: createChatCompletionSequenceFetch(
          [createLiveQuantPatternResponseContent("task-mock-quant-live")],
          calls
        )
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.taskState, "DONE");
    assert.equal(result.agentModes?.["product-agent"], "mock");
    assert.equal(result.agentModes?.["architect-agent"], "mock");
    assert.equal(result.agentModes?.["quant-pattern-agent"], "live");
    assert.equal(calls.length, 1);
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock with docs-reviewer live override runs happy flow", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const calls: Array<{ body?: Record<string, unknown> }> = [];
    const result = await runWithArgv(
      [
        "--mode",
        "mock",
        "--agent-mode",
        "docs-reviewer=live",
        "--scenario",
        "happy",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-mock-docs-live",
        "--requested-by",
        "tester",
        "--task-title",
        "Docs reviewer live only"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: createChatCompletionSequenceFetch(
          [createLiveDocsReviewerResponseContent("task-mock-docs-live")],
          calls
        )
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.taskState, "DONE");
    assert.equal(result.agentModes?.["product-agent"], "mock");
    assert.equal(result.agentModes?.["architect-agent"], "mock");
    assert.equal(result.agentModes?.["quant-pattern-agent"], "mock");
    assert.equal(result.agentModes?.["docs-reviewer-agent"], "live");
    assert.equal(calls.length, 1);
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("docs-reviewer live path preserves REVIEW -> IMPLEMENT reentry transition", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const manager = new ConfigReleaseManager(workspaceRoot);
    const snapshot = await manager.compileSnapshot({
      environment: "local",
      version: "v1",
      overwrite: true
    });
    const snapshotPath = join(workspaceRoot, snapshot.snapshotPath);

    const resolvedHandlers = resolveHandlers({
      rootDir: workspaceRoot,
      agentModes: {
        "product-agent": "mock",
        "architect-agent": "mock",
        "quant-pattern-agent": "mock",
        "backend-agent": "mock",
        "docs-reviewer-agent": "live"
      },
      openAiApiKey: process.env.OPENAI_API_KEY,
      fetchImpl: createChatCompletionSequenceFetch([
        createLiveDocsReviewerResponseContent("task-review-reentry", {
          nextAction: "return_to_implement"
        })
      ])
    });

    const orchestrator = await OrchestratorCore.fromSnapshotFile({
      snapshotPath,
      handlers: resolvedHandlers.handlers,
      executedBy: "orchestrator-runner-test"
    });

    const initialTask = {
      taskId: "task-review-reentry",
      requestedBy: "tester",
      workflowState: "INTAKE",
      input: { title: "Reentry test" },
      configVersion: "v1",
      artifactRefs: []
    };

    let result = await orchestrator.transition({
      task: initialTask,
      to: "DESIGN",
      reason: "INTAKE -> DESIGN"
    });
    result = await orchestrator.transition({
      task: result.task,
      to: "FORMALIZE",
      reason: "DESIGN -> FORMALIZE",
      approvalRef: {
        approvalId: "appr-arch-review-reentry",
        approvalType: "ARCHITECTURE",
        approvedBy: "tester",
        approvedAtUtc: new Date().toISOString(),
        status: "approved"
      }
    });
    result = await orchestrator.transition({
      task: result.task,
      to: "IMPLEMENT",
      reason: "FORMALIZE -> IMPLEMENT"
    });
    result = await orchestrator.transition({
      task: result.task,
      to: "REVIEW",
      reason: "IMPLEMENT -> REVIEW"
    });
    const reentryResult = await orchestrator.transition({
      task: result.task,
      to: "IMPLEMENT",
      reason: "REVIEW -> IMPLEMENT reentry"
    });

    assert.equal(reentryResult.task.workflowState, "IMPLEMENT");
    assert.equal(reentryResult.transition.from, "REVIEW");
    assert.equal(reentryResult.transition.to, "IMPLEMENT");
    assert.equal(reentryResult.output?.agentRole, "DOCS_REVIEWER");
    assert.equal(reentryResult.output?.nextAction, "return_to_implement");
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock rejects invalid live Quant Pattern output", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    await assert.rejects(
      runWithArgv(
        [
          "--mode",
          "mock",
          "--agent-mode",
          "quant-pattern=live",
          "--scenario",
          "happy",
          "--env",
          "local",
          "--version",
          "v1",
          "--task-id",
          "task-quant-invalid"
        ],
        workspaceRoot,
        {
          liveProductFetchImpl: createChatCompletionFetch(
            createLiveQuantPatternResponseContent("task-quant-invalid", {
              metrics: {
                measurableConditions: ["x"],
                metricsPlan: ["y"],
                evaluationHorizon: "7d",
                invalidationAssumptions: ["z"],
                edgeHypothesis: "h",
                testScenarios: ["t"],
                phaseScope: {
                  marketType: "SPOT_ONLY",
                  leverage: "NONE",
                  fundingRateDependency: "NOT_REQUIRED",
                  derivatives: "NONE"
                }
              }
            })
          )
        }
      ),
      /live quant pattern output/
    );
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock rejects invalid live Docs Reviewer output", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    await assert.rejects(
      runWithArgv(
        [
          "--mode",
          "mock",
          "--agent-mode",
          "docs-reviewer=live",
          "--scenario",
          "happy",
          "--env",
          "local",
          "--version",
          "v1",
          "--task-id",
          "task-docs-reviewer-invalid"
        ],
        workspaceRoot,
        {
          liveProductFetchImpl: createChatCompletionFetch(
            createLiveDocsReviewerResponseContent("task-docs-reviewer-invalid", {
              metrics: {
                docsUpdates: ["x"],
                reviewFindings: ["y"],
                changelogNotes: ["z"],
                missingArtifactWarnings: [],
                driftWarnings: []
              }
            })
          )
        }
      ),
      /live docs reviewer output/
    );
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock with product, architect, quant-pattern, and docs-reviewer live supports scenario both", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const calls: Array<{ body?: Record<string, unknown> }> = [];
    const result = await runWithArgv(
      [
        "--mode",
        "mock",
        "--agent-mode",
        "product=live,architect=live,quant-pattern=live,docs-reviewer=live",
        "--scenario",
        "both",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-mock-both-all-live",
        "--requested-by",
        "tester",
        "--task-title",
        "All live both scenario"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: createChatCompletionSequenceFetch(
          [
            createLiveProductResponseContent("task-mock-both-all-live"),
            createLiveArchitectResponseContent("task-mock-both-all-live"),
            createLiveQuantPatternResponseContent("task-mock-both-all-live"),
            createLiveDocsReviewerResponseContent("task-mock-both-all-live"),
            createLiveProductResponseContent("task-mock-both-all-live"),
            createLiveArchitectResponseContent("task-mock-both-all-live")
          ],
          calls
        )
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.scenarios?.length, 2);
    assert.equal(result.scenarios?.[0]?.finalState, "DONE");
    assert.equal(result.scenarios?.[1]?.finalState, "REJECTED");
    assert.equal(result.agentModes?.["product-agent"], "live");
    assert.equal(result.agentModes?.["architect-agent"], "live");
    assert.equal(result.agentModes?.["quant-pattern-agent"], "live");
    assert.equal(result.agentModes?.["docs-reviewer-agent"], "live");
    assert.equal(calls.length, 6);
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("mode mock with backend live override applies constrained backend patch", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    const backendTargetFile = await prepareBackendTargetFile(workspaceRoot);
    const result = await runWithArgv(
      [
        "--mode",
        "mock",
        "--agent-mode",
        "backend=live",
        "--scenario",
        "happy",
        "--env",
        "local",
        "--version",
        "v1",
        "--task-id",
        "task-backend-live-happy"
      ],
      workspaceRoot,
      {
        liveProductFetchImpl: createChatCompletionFetch(
          createLiveBackendResponseContent("task-backend-live-happy", backendTargetFile)
        )
      }
    );

    assert.equal(result.status, "ok");
    assert.equal(result.taskState, "DONE");
    assert.equal(result.agentModes?.["backend-agent"], "live");
    assert.equal(result.patchPlans.length, 1);

    const patchedFile = await readFile(join(workspaceRoot, backendTargetFile), "utf8");
    assert.match(patchedFile, /patched by live backend/);

    const artifactsDir = resolveArtifactsDir(workspaceRoot, result);
    const patchPlan = await readJsonFile<Array<{ changeType: string; targetFiles: string[] }>>(
      join(artifactsDir, "patch-plan.json")
    );
    assert.equal(patchPlan.length, 1);
    assert.equal(patchPlan[0]?.changeType, "patch_only");
    assert.ok(patchPlan[0]?.targetFiles.includes(backendTargetFile));
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

test("fails when required artifact contract is not satisfied", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const workflowPath = join(workspaceRoot, "configs", "agents", "base", "workflow.yaml");
  const originalWorkflow = await readFile(workflowPath, "utf8");
  const brokenWorkflow = originalWorkflow.replace(
    "    - product-brief",
    "    - product-brief\n    - architecture-design"
  );
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
        "task-mock-missing-required-artifact"
      ],
      workspaceRoot
    ),
    /Missing required artifacts for state 'DESIGN': architecture-design/
  );
});

test("fails when product agent emits forbidden artifact type", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    await assert.rejects(
      runWithArgv(
        [
          "--mode",
          "mock",
          "--agent-mode",
          "product=live",
          "--scenario",
          "happy",
          "--env",
          "local",
          "--version",
          "v1",
          "--task-id",
          "task-product-forbidden-artifact"
        ],
        workspaceRoot,
        {
          liveProductFetchImpl: createChatCompletionFetch(
            createLiveProductResponseContent("task-product-forbidden-artifact", {
              artifacts: ["product-brief", "architecture-design"]
            })
          )
        }
      ),
      /not allowed for 'product-agent'/
    );
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});

test("fails when docs reviewer agent emits forbidden artifact type", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  try {
    await assert.rejects(
      runWithArgv(
        [
          "--mode",
          "mock",
          "--agent-mode",
          "docs-reviewer=live",
          "--scenario",
          "happy",
          "--env",
          "local",
          "--version",
          "v1",
          "--task-id",
          "task-docs-reviewer-forbidden-artifact"
        ],
        workspaceRoot,
        {
          liveProductFetchImpl: createChatCompletionFetch(
            createLiveDocsReviewerResponseContent("task-docs-reviewer-forbidden-artifact", {
              artifacts: ["docs-update", "review-report", "invalid-review-artifact"]
            })
          )
        }
      ),
      /not allowed for 'docs-reviewer-agent'/
    );
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
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

test("persists runtime_failure outcome for invalid live output errors", async (context) => {
  const workspaceRoot = await createRunnerWorkspace();
  context.after(async () => rm(workspaceRoot, { recursive: true, force: true }));

  const oldKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-live-key";

  const runStore = new FileRunStore(workspaceRoot, {
    runIdGenerator: () => "run_runtime_failure_001"
  });

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
          "task-runtime-failure"
        ],
        workspaceRoot,
        {
          liveProductFetchImpl: createChatCompletionFetch("not-json"),
          runStore
        }
      ),
      /Failed to parse OpenAI JSON output/
    );

    const artifactsDir = join(workspaceRoot, "runtime", "runs", "run_runtime_failure_001");
    const runRecord = await readJsonFile<{
      finalState: string;
      outcome: string;
    }>(join(artifactsDir, "run.json"));
    const terminalOutcome = await readJsonFile<{
      finalState: string;
      outcome: string;
      reason?: string;
    }>(join(artifactsDir, "terminal-outcome.json"));

    assert.equal(runRecord.finalState, "FAILED");
    assert.equal(runRecord.outcome, "runtime_failure");
    assert.equal(terminalOutcome.finalState, "FAILED");
    assert.equal(terminalOutcome.outcome, "runtime_failure");
    assert.match(terminalOutcome.reason ?? "", /Failed to parse OpenAI JSON output/);
  } finally {
    if (oldKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = oldKey;
    }
  }
});
