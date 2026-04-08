export class OrchestratorConfigError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "OrchestratorConfigError";
  }
}

export class OrchestratorExecutionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "OrchestratorExecutionError";
  }
}
