export type BackendPatchLimits = {
  maxTargetFiles: number;
  maxTotalContentBytes: number;
  maxPerFileContentBytes: number;
  enforceSingleRoot: boolean;
};

export type PatchLimitChecks = {
  maxFilesPassed: boolean;
  maxSizePassed: boolean;
  maxPerFileSizePassed: boolean;
  singleRootPassed: boolean;
};

export type PatchLimitValidation = {
  singleRootKey: string;
  totalContentBytes: number;
  limitChecks: PatchLimitChecks;
};

export const DEFAULT_BACKEND_PATCH_LIMITS: BackendPatchLimits = {
  maxTargetFiles: 12,
  maxTotalContentBytes: 120_000,
  maxPerFileContentBytes: 40_000,
  enforceSingleRoot: true
};

export function deriveRootKey(filePath: string): string {
  const normalized = filePath.trim().replace(/\\/gu, "/").replace(/^\.\/+/u, "");
  const [first, second] = normalized.split("/");
  if (first && second) {
    return `${first}/${second}`;
  }
  return first ?? "unknown";
}
