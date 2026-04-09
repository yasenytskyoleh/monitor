import { AgentSpecificValidationError } from "../core/errors.js";
import { assertRequiredString, assertStringArray } from "./shared.js";

export type BackendChangeType = "patch_only" | "new_file" | "test_only" | "docs_only";
export type BackendDiffOperation = "create" | "update";

export type BackendProposedDiff = {
  filePath: string;
  operation: BackendDiffOperation;
  content: string;
};

export type BackendSafetyMetrics = {
  changePlan: string[];
  targetFiles: string[];
  changeType: BackendChangeType;
  requiresSchemaChange: boolean;
  requiresArchitectureChange: boolean;
  requiresMigration: boolean;
  proposedDiffs: BackendProposedDiff[];
  testsPlan: string[];
  knownLimitations: string[];
};

export type BackendSafetyPolicy = {
  allowedTargetPathPrefixes: string[];
  forbiddenPathPrefixes: string[];
  forbiddenExactPaths: string[];
  allowedChangeTypes: BackendChangeType[];
  allowSchemaChange: boolean;
  allowArchitectureChange: boolean;
  allowMigration: boolean;
  maxTargetFiles: number;
  maxProposedDiffs: number;
};

export const DEFAULT_BACKEND_SAFETY_POLICY: BackendSafetyPolicy = {
  allowedTargetPathPrefixes: [
    "apps/orchestrator-runner/src/",
    "apps/orchestrator-runner/test/",
    "docs/agents/",
    "docs/project/"
  ],
  forbiddenPathPrefixes: [
    "configs/",
    "packages/agent-config/",
    "packages/orchestrator-core/",
    ".github/",
    ".changeset/"
  ],
  forbiddenExactPaths: [
    "pnpm-lock.yaml",
    "package.json",
    "pnpm-workspace.yaml",
    ".env",
    ".env.example"
  ],
  allowedChangeTypes: ["patch_only", "test_only", "docs_only"],
  allowSchemaChange: false,
  allowArchitectureChange: false,
  allowMigration: false,
  maxTargetFiles: 12,
  maxProposedDiffs: 20
};

export function parseBackendSafetyMetrics(value: unknown): BackendSafetyMetrics {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live backend output: metrics must be an object for completed status"
    );
  }

  const record = value as Record<string, unknown>;
  assertStringArray(
    record.changePlan,
    "Schema validation failed for live backend output: metrics.changePlan must be a non-empty string array"
  );
  assertStringArray(
    record.targetFiles,
    "Schema validation failed for live backend output: metrics.targetFiles must be a non-empty string array"
  );

  const changeType = parseChangeType(record.changeType);
  const requiresSchemaChange = parseRequiredBoolean(record.requiresSchemaChange, "metrics.requiresSchemaChange");
  const requiresArchitectureChange = parseRequiredBoolean(
    record.requiresArchitectureChange,
    "metrics.requiresArchitectureChange"
  );
  const requiresMigration = parseRequiredBoolean(record.requiresMigration, "metrics.requiresMigration");
  const proposedDiffs = parseProposedDiffs(record.proposedDiffs);

  assertStringArray(
    record.testsPlan,
    "Schema validation failed for live backend output: metrics.testsPlan must be a non-empty string array"
  );
  assertStringArray(
    record.knownLimitations,
    "Schema validation failed for live backend output: metrics.knownLimitations must be a non-empty string array"
  );

  return {
    changePlan: record.changePlan as string[],
    targetFiles: record.targetFiles as string[],
    changeType,
    requiresSchemaChange,
    requiresArchitectureChange,
    requiresMigration,
    proposedDiffs,
    testsPlan: record.testsPlan as string[],
    knownLimitations: record.knownLimitations as string[]
  };
}

export function validateBackendSafetyRules(
  metrics: BackendSafetyMetrics,
  policy: BackendSafetyPolicy = DEFAULT_BACKEND_SAFETY_POLICY
): void {
  if (!policy.allowedChangeTypes.includes(metrics.changeType)) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: changeType '${metrics.changeType}' is not allowed`
    );
  }

  if (metrics.requiresSchemaChange && !policy.allowSchemaChange) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live backend output: requiresSchemaChange=true is forbidden in current safety policy and must escalate"
    );
  }

  if (metrics.requiresArchitectureChange && !policy.allowArchitectureChange) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live backend output: requiresArchitectureChange=true is forbidden in current safety policy and must escalate"
    );
  }

  if (metrics.requiresMigration && !policy.allowMigration) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live backend output: requiresMigration=true is forbidden in current safety policy and must escalate"
    );
  }

  const targetFiles = uniqueStrings(metrics.targetFiles);
  if (targetFiles.length === 0) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live backend output: metrics.targetFiles must include at least one file"
    );
  }

  if (targetFiles.length > policy.maxTargetFiles) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: targetFiles count ${targetFiles.length} exceeds safety limit ${policy.maxTargetFiles}`
    );
  }

  for (const filePath of targetFiles) {
    assertPathAllowed(filePath, policy);
  }

  const proposedDiffs = metrics.proposedDiffs;
  if (proposedDiffs.length === 0) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live backend output: metrics.proposedDiffs must include at least one diff"
    );
  }

  if (proposedDiffs.length > policy.maxProposedDiffs) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: proposedDiffs count ${proposedDiffs.length} exceeds safety limit ${policy.maxProposedDiffs}`
    );
  }

  for (const diff of proposedDiffs) {
    assertPathAllowed(diff.filePath, policy);
    if (!targetFiles.includes(diff.filePath)) {
      throw new AgentSpecificValidationError(
        `Schema validation failed for live backend output: proposedDiff file '${diff.filePath}' must be listed in targetFiles`
      );
    }
    if (metrics.changeType === "patch_only" && diff.operation !== "update") {
      throw new AgentSpecificValidationError(
        "Schema validation failed for live backend output: patch_only changeType may only use update operations"
      );
    }
    if (metrics.changeType !== "new_file" && diff.operation === "create") {
      throw new AgentSpecificValidationError(
        `Schema validation failed for live backend output: changeType '${metrics.changeType}' may not create new files`
      );
    }
    assertRequiredString(
      diff.content,
      `Schema validation failed for live backend output: proposed diff content is required for '${diff.filePath}'`
    );
  }
}

function parseChangeType(value: unknown): BackendChangeType {
  if (
    value === "patch_only" ||
    value === "new_file" ||
    value === "test_only" ||
    value === "docs_only"
  ) {
    return value;
  }

  throw new AgentSpecificValidationError(
    "Schema validation failed for live backend output: metrics.changeType must be one of patch_only|new_file|test_only|docs_only"
  );
}

function parseRequiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: ${field} must be boolean`
    );
  }
  return value;
}

function parseProposedDiffs(value: unknown): BackendProposedDiff[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live backend output: metrics.proposedDiffs must be a non-empty array"
    );
  }

  const parsed: BackendProposedDiff[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new AgentSpecificValidationError(
        "Schema validation failed for live backend output: every proposedDiff must be an object"
      );
    }

    const record = item as Record<string, unknown>;
    const filePath = parseFilePath(record.filePath, "metrics.proposedDiffs[].filePath");
    const operation = parseOperation(record.operation);
    const content = parseFileContent(record.content);

    parsed.push({
      filePath,
      operation,
      content
    });
  }

  return parsed;
}

function parseOperation(value: unknown): BackendDiffOperation {
  if (value === "create" || value === "update") {
    return value;
  }
  throw new AgentSpecificValidationError(
    "Schema validation failed for live backend output: proposedDiff.operation must be create or update"
  );
}

function parseFileContent(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live backend output: proposedDiff.content must be a non-empty string"
    );
  }
  return value;
}

function parseFilePath(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: ${field} must be a non-empty string`
    );
  }
  return normalizePath(value);
}

function assertPathAllowed(filePath: string, policy: BackendSafetyPolicy): void {
  const normalizedPath = normalizePath(filePath);
  const lowerPath = normalizedPath.toLowerCase();

  if (policy.forbiddenExactPaths.some((blocked) => normalizePath(blocked) === normalizedPath)) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: forbidden target path '${normalizedPath}'`
    );
  }

  if (policy.forbiddenPathPrefixes.some((prefix) => lowerPath.startsWith(normalizePath(prefix).toLowerCase()))) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: forbidden target path '${normalizedPath}'`
    );
  }

  const allowed = policy.allowedTargetPathPrefixes.some((prefix) =>
    lowerPath.startsWith(normalizePath(prefix).toLowerCase())
  );

  if (!allowed) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: target path '${normalizedPath}' is outside allowlisted boundaries`
    );
  }
}

function normalizePath(value: string): string {
  return value.trim().replace(/\\/gu, "/").replace(/^\.\/+/u, "");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}
