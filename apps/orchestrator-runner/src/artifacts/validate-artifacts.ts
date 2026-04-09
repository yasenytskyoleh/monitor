import type { RuntimeConfigSnapshot } from "@monitor/agent-config";
import type { TransitionResult } from "@monitor/orchestrator-core";

import { ArtifactRegistry } from "./registry.js";
import type { WorkflowArtifact } from "./types.js";

type ValidateTransitionArtifactsInput = {
  snapshot: RuntimeConfigSnapshot;
  registry: ArtifactRegistry;
  transitionResult: TransitionResult;
  additionalArtifactTypes?: string[];
};

export function validateTransitionArtifacts(input: ValidateTransitionArtifactsInput): {
  transitionArtifactRefs: string[];
  emittedArtifacts: WorkflowArtifact[];
} {
  const transition = input.transitionResult.transition;
  const ownerRole = input.snapshot.workflow.stateOwners[transition.from];
  const ownerAgent = input.snapshot.agents.find((agent) => agent.role === ownerRole);
  const emittedArtifacts: WorkflowArtifact[] = [];

  if (input.transitionResult.output?.artifacts && input.transitionResult.output.artifacts.length > 0) {
    if (!ownerAgent) {
      throw new Error(
        `State '${transition.from}' emitted artifacts but owner role '${ownerRole ?? "unknown"}' is not an agent`
      );
    }

    emittedArtifacts.push(
      ...input.registry.register({
        producer: ownerAgent.id as WorkflowArtifact["producedBy"],
        state: transition.from,
        createdAtUtc: transition.timestampUtc,
        artifactTypes: input.transitionResult.output.artifacts
      })
    );
  }

  if (input.additionalArtifactTypes && input.additionalArtifactTypes.length > 0) {
    emittedArtifacts.push(
      ...input.registry.register({
        producer: "orchestrator-runner",
        state: transition.from,
        createdAtUtc: transition.timestampUtc,
        artifactTypes: input.additionalArtifactTypes
      })
    );
  }

  input.registry.assertReferencesKnown(transition.artifactRefs);
  const requiredForTargetState = input.snapshot.workflow.requiredArtifactsByState?.[transition.to] ?? [];
  input.registry.assertRequiredArtifactTypes(transition.to, requiredForTargetState);

  return {
    transitionArtifactRefs: input.registry.resolveTransitionArtifactRefs(transition.artifactRefs),
    emittedArtifacts
  };
}

