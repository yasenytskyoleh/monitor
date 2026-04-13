import { AgentSpecificValidationError } from "../adapters/live/core/errors.js";

export type BackendPatchFailureCategory =
  | "patch_validation_failure"
  | "patch_limit_exceeded"
  | "forbidden_path"
  | "forbidden_change_type"
  | "apply_failure"
  | "post_apply_validation_failure"
  | "promotion_failure"
  | "rollback_failed"
  | "lint_failed"
  | "typecheck_failed"
  | "test_failed"
  | "verification_timeout";

export class BackendPatchError extends AgentSpecificValidationError {
  public readonly failureCategory: BackendPatchFailureCategory;

  public constructor(
    category: BackendPatchFailureCategory,
    message: string,
    options: { cause?: unknown; metadata?: Record<string, unknown> } = {}
  ) {
    super(`[${category}] ${message}`, options);
    this.name = "BackendPatchError";
    this.failureCategory = category;
    if (options.metadata) {
      (this as BackendPatchError & { metadata?: Record<string, unknown> }).metadata = options.metadata;
    }
  }
}

export function isBackendPatchError(error: unknown): error is BackendPatchError {
  return error instanceof BackendPatchError;
}
