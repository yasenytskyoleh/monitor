import type { AgentHandlerContext, AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { applyBackendPatchPlan } from "../../backend-patch/apply-patch-plan.js";
import { BackendPatchError, isBackendPatchError, type BackendPatchFailureCategory } from "../../backend-patch/errors.js";
import type { PatchResultEvidence } from "../../backend-patch/types.js";
import { validatePostApplyResult } from "../../backend-patch/post-apply-validate.js";
import { validateBackendPatchPlan } from "../../backend-patch/validate-patch-plan.js";
import { applyRollback, assertRollbackSucceeded } from "../../backend-rollback/apply-rollback.js";
import { buildRollbackPlan } from "../../backend-rollback/build-rollback-plan.js";
import type {
  BackendRollbackMode,
  BackendRollbackPlan,
  BackendRollbackResult,
  RollbackPlanEvidence,
  RollbackResultEvidence,
  RollbackTriggerReason
} from "../../backend-rollback/types.js";
import { runBackendVerificationHooks } from "../../backend-verification/run-verification-hooks.js";
import type {
  BackendVerificationMode,
  BackendVerificationResult,
  VerificationResultEvidence
} from "../../backend-verification/types.js";
import { createLiveAgentHandler } from "./core/execute-live-agent.js";
import type { LiveAdapterOptions } from "./core/types.js";
import { BACKEND_RESPONSE_SCHEMA } from "./schemas/backend-agent-response-schema.js";
import { assertBackendOutput } from "./validators/assert-backend-output.js";

export type LiveBackendAgentOptions = LiveAdapterOptions & {
  rootDir: string;
  dryRun?: boolean;
  rollbackMode?: BackendRollbackMode;
  verificationMode?: BackendVerificationMode;
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
        "For completed status include metrics.changePlan[], targetFiles[], changeType, requiresSchemaChange, requiresArchitectureChange, requiresMigration, proposedDiffs[], testsPlan[], knownLimitations[]. Use test_focused_multi_file only for constrained test-oriented multi-file plans (max 3 files, max 1 create, at least one test file).",
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
  const applyMode: "dry-run" | "apply" = options.dryRun === false ? "apply" : "dry-run";
  const rollbackMode: BackendRollbackMode = options.rollbackMode ?? "restore_written_files";
  const rollbackPlan = await buildRollbackPlan({
    patchPlan,
    applyMode
  });

  let applyResult:
    | Awaited<ReturnType<typeof applyBackendPatchPlan>>
    | undefined;
  let postApplyResult:
    | Awaited<ReturnType<typeof validatePostApplyResult>>
    | undefined;
  let verificationResult: BackendVerificationResult | undefined;
  let rollbackResult: BackendRollbackResult | undefined;

  try {
    applyResult = await applyBackendPatchPlan(patchPlan, {
      dryRun: options.dryRun ?? true
    });
    postApplyResult = await validatePostApplyResult({
      patchPlan,
      applyResult
    });
    verificationResult = await runBackendVerificationHooks({
      mode: options.verificationMode ?? "none",
      cwd: options.rootDir,
      applied: applyResult.applied
    });
  } catch (error) {
    const triggerReason = mapRollbackTriggerReason(error);
    rollbackResult = await resolveRollbackResult({
      rollbackMode,
      rollbackPlan,
      triggerReason
    });

    const patchFailure = buildFailurePatchResult({
      taskId: context.task.taskId,
      applyMode,
      rollbackResult,
      applyResult,
      error
    });
    const fallbackVerificationResult = buildFailureVerificationResult({
      taskId: context.task.taskId,
      mode: options.verificationMode ?? "none",
      applied: applyMode === "apply",
      error
    });

    try {
      assertRollbackSucceeded(rollbackResult);
    } catch (rollbackError) {
      throw createAugmentedBackendError(
        rollbackError,
        patchFailure,
        fallbackVerificationResult,
        rollbackPlan,
        rollbackResult,
        context.task.taskId
      );
    }

    throw createAugmentedBackendError(
      error,
      patchFailure,
      fallbackVerificationResult,
      rollbackPlan,
      rollbackResult,
      context.task.taskId
    );
  }

  const metrics =
    output.metrics && typeof output.metrics === "object" && !Array.isArray(output.metrics)
      ? { ...output.metrics }
      : {};

  const operations = patchPlan.proposedDiffs.map((diff) => ({
    filePath: diff.filePath,
    operation: diff.operation
  }));
  const createdFiles = operations
    .filter((operation) => operation.operation === "create")
    .map((operation) => operation.filePath);
  const updatedFiles = operations
    .filter((operation) => operation.operation === "update")
    .map((operation) => operation.filePath);

  return {
    ...output,
    metrics: {
      ...metrics,
      patchPlan: {
        patchMode:
          patchPlan.changeType === "test_focused_multi_file"
            ? "test_focused_multi_file"
            : "single_file",
        testFocused: patchPlan.changeType === "test_focused_multi_file",
        changeType: patchPlan.changeType,
        applyMode: applyResult.applyMode,
        rollbackMode,
        targetFiles: patchPlan.targetFiles,
        createdFiles,
        updatedFiles,
        operations,
        singleRootKey: patchPlan.singleRootKey,
        totalContentBytes: patchPlan.totalContentBytes,
        limitChecks: patchPlan.limitChecks
      },
      patchApplyResult: {
        applyMode: applyResult.applyMode,
        applied: applyResult.applied,
        changedFiles: applyResult.changedFiles,
        createdFiles,
        updatedFiles,
        appliedOperations: applyResult.appliedOperations,
        appliedCount: applyResult.appliedOperations.length,
        dryRun: applyResult.dryRun,
        postApplyValidationPassed: postApplyResult.passed,
        postApplyChecks: postApplyResult.checks,
        failureCategory: null,
        failureReason: null
      },
      verificationResult,
      ...(rollbackPlan
        ? {
            rollbackPlan: {
              applyMode: rollbackPlan.applyMode,
              rollbackMode,
              entries: rollbackPlan.entries.map((entry) => ({
                filePath: entry.filePath,
                existedBefore: entry.existedBefore,
                previousContent: entry.previousContent
              }))
            },
            rollbackResult: {
              rollbackAttempted: false,
              triggerReason: null,
              restoredFiles: [],
              deletedCreatedFiles: [],
              status: "skipped",
              failureReason: null
            }
          }
        : {})
    }
  };
}

async function resolveRollbackResult(input: {
  rollbackMode: BackendRollbackMode;
  rollbackPlan: BackendRollbackPlan | null;
  triggerReason: RollbackTriggerReason;
}): Promise<BackendRollbackResult> {
  if (!input.rollbackPlan) {
    return buildSkippedRollbackResult(null);
  }

  if (input.rollbackMode === "none") {
    return buildSkippedRollbackResult("Rollback skipped: backend rollback mode is set to 'none'.");
  }

  return applyRollback({
    plan: input.rollbackPlan,
    triggerReason: input.triggerReason
  });
}

function buildSkippedRollbackResult(failureReason: string | null): BackendRollbackResult {
  return {
    rollbackAttempted: false,
    triggerReason: null,
    restoredFiles: [],
    deletedCreatedFiles: [],
    status: "skipped",
    failureReason
  };
}

function createAugmentedBackendError(
  error: unknown,
  patchFailure: PatchResultEvidence,
  verificationFailure: BackendVerificationResult,
  rollbackPlan: BackendRollbackPlan | null,
  rollbackResult: BackendRollbackResult,
  taskId: string
): BackendPatchError {
  const source = isBackendPatchError(error)
    ? error
    : new BackendPatchError(
        "apply_failure",
        error instanceof Error ? error.message : String(error),
        { cause: error }
      );

  const wrapped = new BackendPatchError(
    source.failureCategory,
    source.message,
    {
      cause: source,
      metadata: {
        patchResult: patchFailure,
        verificationResult: toVerificationEvidence(taskId, verificationFailure),
        ...(rollbackPlan ? { rollbackPlan: toRollbackPlanEvidence(taskId, rollbackPlan) } : {}),
        rollbackResult: toRollbackResultEvidence(taskId, rollbackResult)
      }
    }
  );

  return wrapped;
}

function buildFailurePatchResult(input: {
  taskId: string;
  applyMode: "dry-run" | "apply";
  rollbackResult: BackendRollbackResult;
  applyResult?: Awaited<ReturnType<typeof applyBackendPatchPlan>>;
  error: unknown;
}): PatchResultEvidence {
  return {
    taskId: input.taskId,
    applyMode: input.applyMode,
    applied: input.applyMode === "apply" && input.rollbackResult.status !== "succeeded",
    changedFiles: input.applyResult?.changedFiles ?? [],
    createdFiles:
      input.applyResult?.appliedOperations
        .filter((operation) => operation.operation === "create")
        .map((operation) => operation.filePath) ?? [],
    updatedFiles:
      input.applyResult?.appliedOperations
        .filter((operation) => operation.operation === "update")
        .map((operation) => operation.filePath) ?? [],
    postApplyValidationPassed: false,
    failureCategory: resolveFailureCategory(input.error),
    failureReason: input.error instanceof Error ? input.error.message : String(input.error)
  };
}

function buildFailureVerificationResult(input: {
  taskId: string;
  mode: BackendVerificationMode;
  applied: boolean;
  error: unknown;
}): BackendVerificationResult {
  const fallback: BackendVerificationResult = {
    applied: input.applied,
    hooksRequested:
      input.mode === "none"
        ? []
        : input.mode === "lint"
          ? ["lint"]
          : input.mode === "lint+typecheck"
            ? ["lint", "typecheck"]
            : ["lint", "typecheck", "test"],
    hooksExecuted: [],
    overallStatus: "failed"
  };

  if (isBackendPatchError(input.error)) {
    const metadata = (input.error as BackendPatchError & { metadata?: Record<string, unknown> }).metadata;
    const candidate = metadata?.verificationResult;
    if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
      return candidate as BackendVerificationResult;
    }
  }

  return fallback;
}

function resolveFailureCategory(error: unknown): BackendPatchFailureCategory {
  if (isBackendPatchError(error)) {
    return error.failureCategory;
  }
  return "apply_failure";
}

function mapRollbackTriggerReason(error: unknown): RollbackTriggerReason {
  if (isBackendPatchError(error)) {
    if (error.failureCategory === "post_apply_validation_failure") {
      if (error.message.toLowerCase().includes("unexpected file write")) {
        return "unexpected_write_detected";
      }
      return "post_apply_validation_failed";
    }
    if (
      error.failureCategory === "lint_failed" ||
      error.failureCategory === "typecheck_failed" ||
      error.failureCategory === "test_failed" ||
      error.failureCategory === "verification_timeout"
    ) {
      return "verification_failed";
    }
    if (error.message.includes("Unknown backend verification mode")) {
      return "verification_failed";
    }
  }

  return "apply_failed";
}

function toRollbackPlanEvidence(taskId: string, plan: BackendRollbackPlan): RollbackPlanEvidence {
  return {
    taskId,
    applyMode: "apply",
    entries: plan.entries.map((entry) => ({
      filePath: entry.filePath,
      existedBefore: entry.existedBefore,
      previousContent: entry.previousContent
    }))
  };
}

function toRollbackResultEvidence(taskId: string, result: BackendRollbackResult): RollbackResultEvidence {
  return {
    taskId,
    rollbackAttempted: result.rollbackAttempted,
    triggerReason: result.triggerReason,
    restoredFiles: result.restoredFiles,
    deletedCreatedFiles: result.deletedCreatedFiles,
    status: result.status,
    failureReason: result.failureReason
  };
}

function toVerificationEvidence(
  taskId: string,
  result: BackendVerificationResult
): VerificationResultEvidence {
  return {
    taskId,
    applied: result.applied,
    hooksRequested: result.hooksRequested,
    hooksExecuted: result.hooksExecuted,
    overallStatus: result.overallStatus
  };
}
