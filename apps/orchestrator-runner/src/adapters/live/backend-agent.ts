import type { AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { applyBackendPatchPlan } from "../../backend-patch/apply-patch-plan.js";
import { validatePostApplyResult } from "../../backend-patch/post-apply-validate.js";
import { validateBackendPatchPlan } from "../../backend-patch/validate-patch-plan.js";
import { createLiveAgentHandler } from "./core/execute-live-agent.js";
import type { LiveAdapterOptions } from "./core/types.js";
import { BACKEND_RESPONSE_SCHEMA } from "./schemas/backend-agent-response-schema.js";
import { assertBackendOutput } from "./validators/assert-backend-output.js";

export type LiveBackendAgentOptions = LiveAdapterOptions & {
  rootDir: string;
  dryRun?: boolean;
};

export function createLiveBackendAgentHandler(options: LiveBackendAgentOptions) {
  return createLiveAgentHandler(options, {
    adapterLabel: "Live Backend",
    boundAgentId: "backend-agent",
    expectedRole: "BACKEND",
    responseFormatName: "backend_agent_output_v1",
    responseSchema: BACKEND_RESPONSE_SCHEMA,
    envelopeValidationContext: "live backend output",
    nullableFields: ["risks", "notes", "metrics", "escalation"],
    additionalSystemInstructions: [
      "You are in constrained patch mode.",
      "Only produce safe, deterministic patch plans within allowlisted paths.",
      "Do not include dependency, lockfile, schema, migration, or architecture mutations.",
      "Escalate instead of proposing forbidden mutations."
    ],
    buildUserPrompt,
    assertSpecificOutput: assertBackendOutput,
    finalizeOutput: async (output, context) => finalizeBackendOutput(output, context, options)
  });
}

function buildUserPrompt(context: AgentHandlerContext): string {
  const requiredArtifactsForTargetState =
    context.snapshot.workflow.requiredArtifactsByState?.[context.targetState] ?? [];

  const payload = {
    task: context.task,
    targetState: context.targetState,
    outputRequirements: {
      status: "Use completed, blocked, needs_escalation, or rejected.",
      nextAction:
        "Use one valid action from the schema. For successful implementation handoff use handoff_to_docs_reviewer.",
      artifacts:
        "Return backend artifact types only (code-change, tests, implementation-notes).",
      backendSafetyMetrics:
        "For completed status include metrics.changePlan[], targetFiles[], changeType, requiresSchemaChange, requiresArchitectureChange, requiresMigration, proposedDiffs[], testsPlan[], knownLimitations[].",
      requiredArtifactsForTargetState
    }
  };

  return [
    "Produce Backend Agent output in constrained patch mode.",
    "Return exactly one JSON object following the provided schema.",
    JSON.stringify(payload, null, 2)
  ].join("\n\n");
}

async function finalizeBackendOutput(
  output: AgentOutputEnvelope,
  context: AgentHandlerContext,
  options: LiveBackendAgentOptions
): Promise<AgentOutputEnvelope> {
  if (output.status !== "completed") {
    return output;
  }

  const patchPlan = validateBackendPatchPlan({
    taskId: context.task.taskId,
    rootDir: options.rootDir,
    metrics: output.metrics
  });

  const applyResult = await applyBackendPatchPlan(patchPlan, {
    dryRun: options.dryRun ?? true
  });
  const postApplyResult = await validatePostApplyResult({
    patchPlan,
    applyResult
  });

  const metrics =
    output.metrics && typeof output.metrics === "object" && !Array.isArray(output.metrics)
      ? { ...output.metrics }
      : {};

  const operations = patchPlan.proposedDiffs.map((diff) => ({
    filePath: diff.filePath,
    operation: diff.operation
  }));

  return {
    ...output,
    metrics: {
      ...metrics,
      patchPlan: {
        changeType: patchPlan.changeType,
        applyMode: applyResult.applyMode,
        targetFiles: patchPlan.targetFiles,
        operations,
        singleRootKey: patchPlan.singleRootKey,
        totalContentBytes: patchPlan.totalContentBytes,
        limitChecks: patchPlan.limitChecks
      },
      patchApplyResult: {
        applyMode: applyResult.applyMode,
        applied: applyResult.applied,
        changedFiles: applyResult.changedFiles,
        appliedOperations: applyResult.appliedOperations,
        appliedCount: applyResult.appliedOperations.length,
        dryRun: applyResult.dryRun,
        postApplyValidationPassed: postApplyResult.passed,
        postApplyChecks: postApplyResult.checks,
        failureCategory: null,
        failureReason: null
      }
    }
  };
}
