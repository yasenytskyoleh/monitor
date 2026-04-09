import type { WorkflowArtifact } from "./types.js";

type ArtifactRefGenerator = (input: {
  scenario: string;
  artifactType: string;
  version: number;
}) => string;

type ArtifactRegistryOptions = {
  runId: string;
  taskId: string;
  scenario: string;
  artifactRefGenerator?: ArtifactRefGenerator;
};

type RegisterArtifactsInput = {
  producer: WorkflowArtifact["producedBy"];
  state: string;
  createdAtUtc: string;
  artifactTypes: string[];
  metadata?: Record<string, unknown>;
};

const AGENT_ALLOWED_ARTIFACT_TYPES: Record<string, ReadonlySet<string>> = {
  "product-agent": new Set(["product-brief"]),
  "architect-agent": new Set(["architecture-design", "adr-draft"]),
  "quant-pattern-agent": new Set(["pattern-definition", "metrics-plan"]),
  "backend-agent": new Set(["code-change", "tests", "implementation-notes"]),
  "docs-reviewer-agent": new Set(["docs-update", "review-report"])
};

const SYSTEM_ALLOWED_ARTIFACT_TYPES = new Set(["publishable-signal-bundle"]);

export class ArtifactRegistry {
  private readonly artifactsByRef = new Map<string, WorkflowArtifact>();
  private readonly artifactsByType = new Map<string, WorkflowArtifact[]>();
  private readonly versionsByType = new Map<string, number>();
  private readonly artifactRefGenerator: ArtifactRefGenerator;

  public constructor(private readonly options: ArtifactRegistryOptions) {
    this.artifactRefGenerator =
      options.artifactRefGenerator ??
      ((input) => `${input.scenario}:${input.artifactType}:v${input.version}`);
  }

  public register(input: RegisterArtifactsInput): WorkflowArtifact[] {
    const normalizedTypes = uniqueArtifactTypes(input.artifactTypes);
    if (normalizedTypes.length === 0) {
      return [];
    }

    this.assertProducerAllowedTypes(input.producer, normalizedTypes);

    const createdArtifacts: WorkflowArtifact[] = [];
    for (const artifactType of normalizedTypes) {
      const version = (this.versionsByType.get(artifactType) ?? 0) + 1;
      this.versionsByType.set(artifactType, version);

      const artifactRef = this.artifactRefGenerator({
        scenario: this.options.scenario,
        artifactType,
        version
      });
      if (this.artifactsByRef.has(artifactRef)) {
        throw new Error(`Duplicate artifact reference collision detected: '${artifactRef}'`);
      }

      const artifact: WorkflowArtifact = {
        artifactRef,
        artifactType,
        producedBy: input.producer,
        taskId: this.options.taskId,
        runId: this.options.runId,
        state: input.state,
        createdAtUtc: input.createdAtUtc,
        version,
        scenario: this.options.scenario,
        ...(input.metadata ? { metadata: input.metadata } : {})
      };

      this.artifactsByRef.set(artifactRef, artifact);
      const existingForType = this.artifactsByType.get(artifactType) ?? [];
      existingForType.push(artifact);
      this.artifactsByType.set(artifactType, existingForType);
      createdArtifacts.push(artifact);
    }

    return createdArtifacts;
  }

  public assertReferencesKnown(references: string[]): void {
    for (const rawReference of references) {
      const reference = rawReference.trim();
      if (reference.length === 0) {
        continue;
      }

      if (this.artifactsByRef.has(reference)) {
        continue;
      }

      if (this.artifactsByType.has(reference)) {
        continue;
      }

      throw new Error(`Unknown artifact reference '${reference}'`);
    }
  }

  public assertRequiredArtifactTypes(state: string, requiredArtifactTypes: string[]): void {
    const normalizedRequired = uniqueArtifactTypes(requiredArtifactTypes);
    if (normalizedRequired.length === 0) {
      return;
    }

    const missing = normalizedRequired.filter((artifactType) => !this.artifactsByType.has(artifactType));
    if (missing.length > 0) {
      throw new Error(`Missing required artifacts for state '${state}': ${missing.join(", ")}`);
    }
  }

  public resolveTransitionArtifactRefs(transitionArtifacts: string[]): string[] {
    const resolved: string[] = [];

    for (const rawReference of transitionArtifacts) {
      const reference = rawReference.trim();
      if (reference.length === 0) {
        continue;
      }

      if (this.artifactsByRef.has(reference)) {
        resolved.push(reference);
        continue;
      }

      const artifactsByType = this.artifactsByType.get(reference);
      if (!artifactsByType || artifactsByType.length === 0) {
        throw new Error(`Unknown artifact reference '${reference}'`);
      }

      const latestArtifact = artifactsByType[artifactsByType.length - 1];
      if (!latestArtifact) {
        throw new Error(`Unable to resolve artifact reference for '${reference}'`);
      }
      resolved.push(latestArtifact.artifactRef);
    }

    return uniqueArtifactTypes(resolved);
  }

  public listArtifacts(): WorkflowArtifact[] {
    return Array.from(this.artifactsByRef.values())
      .slice()
      .sort((left, right) => left.createdAtUtc.localeCompare(right.createdAtUtc));
  }

  private assertProducerAllowedTypes(
    producer: WorkflowArtifact["producedBy"],
    artifactTypes: string[]
  ): void {
    if (producer === "orchestrator-runner") {
      const invalidSystemTypes = artifactTypes.filter(
        (artifactType) => !SYSTEM_ALLOWED_ARTIFACT_TYPES.has(artifactType)
      );
      if (invalidSystemTypes.length > 0) {
        throw new Error(
          `Artifact type(s) not allowed for '${producer}': ${invalidSystemTypes.join(", ")}`
        );
      }
      return;
    }

    const allowlist = AGENT_ALLOWED_ARTIFACT_TYPES[producer];
    if (!allowlist) {
      throw new Error(`Unknown artifact producer '${producer}'`);
    }

    const invalidTypes = artifactTypes.filter((artifactType) => !allowlist.has(artifactType));
    if (invalidTypes.length > 0) {
      throw new Error(`Artifact type(s) not allowed for '${producer}': ${invalidTypes.join(", ")}`);
    }
  }
}

function uniqueArtifactTypes(values: string[]): string[] {
  const unique = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length === 0 || unique.has(normalized)) {
      continue;
    }
    unique.add(normalized);
    ordered.push(normalized);
  }
  return ordered;
}

