import type { AgentHandlerContext } from "@monitor/orchestrator-core";
import { assertDocsReviewerOutput } from "./docs-reviewer-output.js";
import { DOCS_REVIEWER_RESPONSE_SCHEMA } from "./schemas/docs-reviewer-agent-response-schema.js";
import { createStructuredLiveAgentHandler } from "./structured-live-handler.js";
import type { LiveAdapterOptions } from "./structured-live-handler.js";

export type LiveDocsReviewerAgentOptions = LiveAdapterOptions;

export function createLiveDocsReviewerAgentHandler(options: LiveDocsReviewerAgentOptions) {
  return createStructuredLiveAgentHandler(options, {
    adapterLabel: "Live Docs Reviewer",
    boundAgentId: "docs-reviewer-agent",
    expectedRole: "DOCS_REVIEWER",
    responseFormatName: "docs_reviewer_agent_output_v1",
    responseSchema: DOCS_REVIEWER_RESPONSE_SCHEMA,
    envelopeValidationContext: "live docs reviewer output",
    nullableFields: ["risks", "notes", "metrics", "escalation"],
    additionalSystemInstructions: [
      "You are bounded to review semantics only. Do not invent architecture or implementation decisions."
    ],
    buildUserPrompt,
    assertDomainOutput: assertDocsReviewerOutput
  });
}

function buildUserPrompt(context: AgentHandlerContext): string {
  const requiredArtifactsForTargetState =
    context.snapshot.workflow.requiredArtifactsByState?.[context.targetState] ?? [];

  const payload = {
    task: context.task,
    targetState: context.targetState,
    artifactInventory: context.task.artifactRefs,
    outputRequirements: {
      status: "Use completed, blocked, needs_escalation, or rejected.",
      nextAction:
        "Use one valid action from the schema. Prefer await_approval when review evidence is complete.",
      artifacts:
        "Return an array of non-empty string artifact refs. Include docs-update and review-report when status is completed.",
      docsReviewFields:
        "When status=completed include metrics.docsUpdates[], metrics.reviewFindings[], metrics.changelogNotes[], metrics.traceabilityConfirmation.{isTraceable,notes[]}, metrics.missingArtifactWarnings[], metrics.driftWarnings[].",
      requiredArtifactsForTargetState
    }
  };

  return [
    "Produce Docs Reviewer Agent output for this task.",
    "Return exactly one JSON object following the provided schema.",
    JSON.stringify(payload, null, 2)
  ].join("\n\n");
}
