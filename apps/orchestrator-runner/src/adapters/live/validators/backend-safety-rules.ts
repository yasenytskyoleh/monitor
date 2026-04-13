import { AgentSpecificValidationError } from "../core/errors.js";
import { assertRequiredString, assertStringArray } from "./shared.js";

export type BackendChangeType =
  | "patch_only"
  | "new_file"
  | "test_only"
  | "docs_only"
  | "test_focused_multi_file";
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
  allowedCreatePathPrefixes: string[];
  allowedCreateFileExtensions: string[];
  allowedJsonHelperCreatePathPrefixes: string[];
  forbiddenPathPrefixes: string[];
  forbiddenExactPaths: string[];
  allowedChangeTypes: BackendChangeType[];
  allowSchemaChange: boolean;
  allowArchitectureChange: boolean;
  allowMigration: boolean;
  maxTargetFiles: number;
  maxProposedDiffs: number;
  maxCreateOperations: number;
  maxTestFocusedTargetFiles: number;
  maxCreateContentBytes: number;
  maxJsonHelperContentBytes: number;
};

export const DEFAULT_BACKEND_SAFETY_POLICY: BackendSafetyPolicy = {
  allowedTargetPathPrefixes: [
    "apps/orchestrator-runner/src/",
    "apps/orchestrator-runner/test/",
    "docs/agents/",
    "docs/project/"
  ],
  allowedCreatePathPrefixes: [
    "apps/orchestrator-runner/src/",
    "apps/orchestrator-runner/test/"
  ],
  allowedCreateFileExtensions: [".ts", ".tsx", ".md", ".json"],
  allowedJsonHelperCreatePathPrefixes: [
    "apps/orchestrator-runner/test/fixtures/"
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
  allowedChangeTypes: [
    "patch_only",
    "new_file",
    "test_only",
    "docs_only",
    "test_focused_multi_file"
  ],
  allowSchemaChange: false,
  allowArchitectureChange: false,
  allowMigration: false,
  maxTargetFiles: 12,
  maxProposedDiffs: 20,
  maxCreateOperations: 1,
  maxTestFocusedTargetFiles: 3,
  maxCreateContentBytes: 8_000,
  maxJsonHelperContentBytes: 2_000
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

  if (targetFiles.length > 1 && metrics.changeType !== "test_focused_multi_file") {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live backend output: multi-file patch sets require changeType 'test_focused_multi_file'"
    );
  }

  if (metrics.changeType === "test_focused_multi_file") {
    if (targetFiles.length < 2) {
      throw new AgentSpecificValidationError(
        "Schema validation failed for live backend output: test_focused_multi_file requires at least two target files"
      );
    }
    if (targetFiles.length > policy.maxTestFocusedTargetFiles) {
      throw new AgentSpecificValidationError(
        `Schema validation failed for live backend output: test_focused_multi_file target count ${targetFiles.length} exceeds limit ${policy.maxTestFocusedTargetFiles}`
      );
    }
    const hasTestPath = targetFiles.some((filePath) => isTestRelatedPath(filePath));
    const hasImplementationPath = targetFiles.some((filePath) => !isTestRelatedPath(filePath));
    if (!hasTestPath) {
      throw new AgentSpecificValidationError(
        "Schema validation failed for live backend output: test_focused_multi_file requires at least one test-related target file"
      );
    }
    if (!hasImplementationPath) {
      throw new AgentSpecificValidationError(
        "Schema validation failed for live backend output: test_focused_multi_file requires at least one non-test implementation target file"
      );
    }
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
    assertRequiredString(
      diff.content,
      `Schema validation failed for live backend output: proposed diff content is required for '${diff.filePath}'`
    );
  }

  const createDiffs = proposedDiffs.filter((diff) => diff.operation === "create");
  if (
    metrics.changeType !== "new_file" &&
    metrics.changeType !== "test_focused_multi_file" &&
    createDiffs.length > 0
  ) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: changeType '${metrics.changeType}' may not create new files`
    );
  }
  if (metrics.changeType === "new_file") {
    if (targetFiles.length !== 1) {
      throw new AgentSpecificValidationError(
        "Schema validation failed for live backend output: changeType 'new_file' supports exactly one target file"
      );
    }
    if (createDiffs.length !== 1) {
      throw new AgentSpecificValidationError(
        "Schema validation failed for live backend output: changeType 'new_file' requires exactly one create operation"
      );
    }
    if (proposedDiffs.length !== 1) {
      throw new AgentSpecificValidationError(
        "Schema validation failed for live backend output: changeType 'new_file' may not include additional update operations"
      );
    }
  }
  if (metrics.changeType === "test_focused_multi_file" && createDiffs.length > policy.maxCreateOperations) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: create operation count ${createDiffs.length} exceeds limit ${policy.maxCreateOperations}`
    );
  }
  if (metrics.changeType === "test_focused_multi_file" && createDiffs.length === 0) {
    // create is optional for expanded mode
  }
  if (metrics.changeType === "new_file" && createDiffs.length === 0) {
    throw new AgentSpecificValidationError(
      "Schema validation failed for live backend output: changeType 'new_file' requires exactly one create operation"
    );
  }
  if (metrics.changeType === "new_file" && createDiffs.length > policy.maxCreateOperations) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: create operation count ${createDiffs.length} exceeds limit ${policy.maxCreateOperations}`
    );
  }

  for (const createDiff of createDiffs) {
    assertCreatePathAllowed(createDiff.filePath, policy);
    assertCreateFileNameSafe(createDiff.filePath);
    assertCreateFileExtensionAllowed(createDiff.filePath, policy);
    assertCreateFileNameNotSensitive(createDiff.filePath);
    assertCreateContentSizeAllowed(createDiff, policy);
    assertJsonHelperPathConstraint(createDiff.filePath, policy);
  }
}

function parseChangeType(value: unknown): BackendChangeType {
  if (
    value === "patch_only" ||
    value === "new_file" ||
    value === "test_only" ||
    value === "docs_only" ||
    value === "test_focused_multi_file"
  ) {
    return value;
  }

  throw new AgentSpecificValidationError(
    "Schema validation failed for live backend output: metrics.changeType must be one of patch_only|new_file|test_only|docs_only|test_focused_multi_file"
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

function assertCreatePathAllowed(filePath: string, policy: BackendSafetyPolicy): void {
  const normalizedPath = normalizePath(filePath).toLowerCase();
  const allowed = policy.allowedCreatePathPrefixes.some((prefix) =>
    normalizedPath.startsWith(normalizePath(prefix).toLowerCase())
  );
  if (!allowed) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: create operation path '${filePath}' is outside create allowlist`
    );
  }
}

function assertCreateFileNameSafe(filePath: string): void {
  const normalizedPath = normalizePath(filePath);
  if (!normalizedPath.includes("/")) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: create operation path '${filePath}' must not be root-level`
    );
  }

  const segments = normalizedPath.split("/");
  if (segments.some((segment) => segment.startsWith("."))) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: create operation path '${filePath}' must not create hidden files`
    );
  }
}

function assertCreateFileExtensionAllowed(filePath: string, policy: BackendSafetyPolicy): void {
  const normalizedPath = normalizePath(filePath).toLowerCase();
  const allowed = policy.allowedCreateFileExtensions.some((extension) =>
    normalizedPath.endsWith(extension.toLowerCase())
  );
  if (!allowed) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: create operation extension is not allowlisted for '${filePath}'`
    );
  }
}

function assertCreateFileNameNotSensitive(filePath: string): void {
  const normalizedPath = normalizePath(filePath).toLowerCase();
  const segments = normalizedPath.split("/");
  const baseName = segments[segments.length - 1] ?? "";
  const blockedExact = new Set([
    "package.json",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    ".env",
    ".env.local",
    ".env.example",
    "tsconfig.json",
    "tsconfig.base.json",
    "schema.prisma"
  ]);
  if (blockedExact.has(baseName)) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: create operation path '${filePath}' is forbidden`
    );
  }

  if (
    baseName.includes("config") ||
    baseName.includes("schema") ||
    baseName.includes("migration")
  ) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: create operation path '${filePath}' looks like config/schema/migration and is forbidden`
    );
  }
}

function assertCreateContentSizeAllowed(diff: BackendProposedDiff, policy: BackendSafetyPolicy): void {
  const normalizedPath = normalizePath(diff.filePath).toLowerCase();
  const bytes = Buffer.byteLength(diff.content, "utf8");
  if (bytes > policy.maxCreateContentBytes) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: create operation content for '${diff.filePath}' exceeds size limit ${policy.maxCreateContentBytes} bytes`
    );
  }
  if (normalizedPath.endsWith(".json") && bytes > policy.maxJsonHelperContentBytes) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: json helper create content for '${diff.filePath}' exceeds size limit ${policy.maxJsonHelperContentBytes} bytes`
    );
  }
}

function assertJsonHelperPathConstraint(filePath: string, policy: BackendSafetyPolicy): void {
  const normalizedPath = normalizePath(filePath).toLowerCase();
  const isJson = normalizedPath.endsWith(".json");
  if (!isJson) {
    return;
  }

  const allowed = policy.allowedJsonHelperCreatePathPrefixes.some((prefix) =>
    normalizedPath.startsWith(normalizePath(prefix).toLowerCase())
  );
  if (!allowed) {
    throw new AgentSpecificValidationError(
      `Schema validation failed for live backend output: json helper create path '${filePath}' is outside json helper allowlist`
    );
  }
}

function normalizePath(value: string): string {
  return value.trim().replace(/\\/gu, "/").replace(/^\.\/+/u, "");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

function isTestRelatedPath(filePath: string): boolean {
  const normalized = normalizePath(filePath).toLowerCase();
  return (
    normalized.includes("/test/") ||
    normalized.includes("/__tests__/") ||
    normalized.endsWith(".test.ts") ||
    normalized.endsWith(".test.tsx") ||
    normalized.endsWith(".spec.ts") ||
    normalized.endsWith(".spec.tsx")
  );
}
