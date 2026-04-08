export class ConfigValidationError extends Error {
  public readonly details: string[];

  public constructor(message: string, details: string[] = []) {
    super(message);
    this.name = "ConfigValidationError";
    this.details = details;
  }
}

export class ConfigSemanticError extends Error {
  public readonly details: string[];

  public constructor(message: string, details: string[] = []) {
    super(message);
    this.name = "ConfigSemanticError";
    this.details = details;
  }
}

export class PermissionDeniedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export class WorkflowTransitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "WorkflowTransitionError";
  }
}

export class ReleaseOperationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ReleaseOperationError";
  }
}
