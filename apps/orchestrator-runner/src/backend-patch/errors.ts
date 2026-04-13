import { AgentSpecificValidationError } from "../adapters/live/core/errors.js";

export type BackendPatchFailureCategory =
  | "patch_validation_failure"
  | "patch_limit_exceeded"
  | "forbidden_path"
  | "forbidden_change_type"
  | "apply_failure"
  | "post_apply_validation_failure";

export class BackendPatchError extends AgentSpecificValidationError {
  public readonly failureCategory: BackendPatchFailureCategory;

  public constructor(
    category: BackendPatchFailureCategory,
    message: string,
    options: { cause?: unknown } = {}
  ) {
    super(`[${category}] ${message}`, options);
    this.name = "BackendPatchError";
    this.failureCategory = category;
  }
}

export function isBackendPatchError(error: unknown): error is BackendPatchError {
  return error instanceof BackendPatchError;
}
