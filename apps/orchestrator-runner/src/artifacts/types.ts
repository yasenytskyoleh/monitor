export type ArtifactProducer =
  | "product-agent"
  | "architect-agent"
  | "quant-pattern-agent"
  | "backend-agent"
  | "docs-reviewer-agent"
  | "orchestrator-runner";

export type WorkflowArtifact = {
  artifactRef: string;
  artifactType: string;
  producedBy: ArtifactProducer;
  taskId: string;
  runId: string;
  state: string;
  createdAtUtc: string;
  version: number;
  scenario?: string;
  metadata?: Record<string, unknown>;
};

