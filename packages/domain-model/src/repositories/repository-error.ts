import type { ProductPersistedEntityType } from "../storage/storage-boundary.js";

export const REPOSITORY_ERROR_CODES = [
  "already_exists",
  "not_found",
  "version_mismatch",
  "invalid_reference",
  "transient_failure",
  "unknown_failure"
] as const;
export type RepositoryErrorCode = (typeof REPOSITORY_ERROR_CODES)[number];

export const REPOSITORY_RETRY_DISPOSITIONS = ["do_not_retry", "retryable"] as const;
export type RepositoryRetryDisposition = (typeof REPOSITORY_RETRY_DISPOSITIONS)[number];

export const REPOSITORY_OPERATIONS = [
  "get_by_id",
  "list_by_status",
  "create",
  "update",
  "update_status",
  "replace_links"
] as const;
export type RepositoryOperation = (typeof REPOSITORY_OPERATIONS)[number];

export type RepositoryErrorDetails = {
  code: RepositoryErrorCode;
  operation: RepositoryOperation;
  entityType: ProductPersistedEntityType;
  entityId?: string | null;
  expectedVersion?: number | null;
  actualVersion?: number | null;
  referenceEntityType?: ProductPersistedEntityType | null;
  referenceEntityId?: string | null;
  retryDisposition: RepositoryRetryDisposition;
};

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  readonly operation: RepositoryOperation;
  readonly entityType: ProductPersistedEntityType;
  readonly entityId: string | null;
  readonly expectedVersion: number | null;
  readonly actualVersion: number | null;
  readonly referenceEntityType: ProductPersistedEntityType | null;
  readonly referenceEntityId: string | null;
  readonly retryDisposition: RepositoryRetryDisposition;

  constructor(message: string, details: RepositoryErrorDetails) {
    super(message);
    this.name = "RepositoryError";
    this.code = details.code;
    this.operation = details.operation;
    this.entityType = details.entityType;
    this.entityId = details.entityId ?? null;
    this.expectedVersion = details.expectedVersion ?? null;
    this.actualVersion = details.actualVersion ?? null;
    this.referenceEntityType = details.referenceEntityType ?? null;
    this.referenceEntityId = details.referenceEntityId ?? null;
    this.retryDisposition = details.retryDisposition;
  }
}

type RepositoryErrorBase = {
  entityType: ProductPersistedEntityType;
  entityId: string;
  operation: RepositoryOperation;
};

export const createAlreadyExistsRepositoryError = (
  details: RepositoryErrorBase
): RepositoryError =>
  new RepositoryError(`${details.entityType} already exists: ${details.entityId}`, {
    code: "already_exists",
    operation: details.operation,
    entityType: details.entityType,
    entityId: details.entityId,
    retryDisposition: "do_not_retry"
  });

export const createNotFoundRepositoryError = (
  details: RepositoryErrorBase
): RepositoryError =>
  new RepositoryError(`${details.entityType} not found: ${details.entityId}`, {
    code: "not_found",
    operation: details.operation,
    entityType: details.entityType,
    entityId: details.entityId,
    retryDisposition: "do_not_retry"
  });

export const createVersionMismatchRepositoryError = (
  details: RepositoryErrorBase & {
    expectedVersion: number;
    actualVersion: number;
  }
): RepositoryError =>
  new RepositoryError(
    `${details.entityType} version mismatch: expected ${details.expectedVersion}, got ${details.actualVersion}`,
    {
      code: "version_mismatch",
      operation: details.operation,
      entityType: details.entityType,
      entityId: details.entityId,
      expectedVersion: details.expectedVersion,
      actualVersion: details.actualVersion,
      retryDisposition: "do_not_retry"
    }
  );

export const createInvalidReferenceRepositoryError = (
  details: RepositoryErrorBase & {
    referenceEntityType: ProductPersistedEntityType;
    referenceEntityId: string;
  }
): RepositoryError =>
  new RepositoryError(
    `invalid ${details.referenceEntityType} reference for ${details.entityType}: ${details.referenceEntityId}`,
    {
      code: "invalid_reference",
      operation: details.operation,
      entityType: details.entityType,
      entityId: details.entityId,
      referenceEntityType: details.referenceEntityType,
      referenceEntityId: details.referenceEntityId,
      retryDisposition: "do_not_retry"
    }
  );
