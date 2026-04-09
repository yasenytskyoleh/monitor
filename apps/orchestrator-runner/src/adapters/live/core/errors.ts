import { OrchestratorExecutionError } from "@monitor/orchestrator-core";

export type LiveAdapterErrorCategory =
  | "prompt_load"
  | "model_call"
  | "response_parse"
  | "envelope_validation"
  | "agent_specific_validation";

type LiveAdapterErrorOptions = {
  cause?: unknown;
};

export class LiveAdapterError extends OrchestratorExecutionError {
  public readonly category: LiveAdapterErrorCategory;

  public constructor(
    message: string,
    category: LiveAdapterErrorCategory,
    options: LiveAdapterErrorOptions = {}
  ) {
    super(message);
    this.name = "LiveAdapterError";
    this.category = category;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export class PromptLoadError extends LiveAdapterError {
  public constructor(message: string, options: LiveAdapterErrorOptions = {}) {
    super(message, "prompt_load", options);
    this.name = "PromptLoadError";
  }
}

export class ModelCallError extends LiveAdapterError {
  public constructor(message: string, options: LiveAdapterErrorOptions = {}) {
    super(message, "model_call", options);
    this.name = "ModelCallError";
  }
}

export class ResponseParseError extends LiveAdapterError {
  public constructor(message: string, options: LiveAdapterErrorOptions = {}) {
    super(message, "response_parse", options);
    this.name = "ResponseParseError";
  }
}

export class EnvelopeValidationError extends LiveAdapterError {
  public constructor(message: string, options: LiveAdapterErrorOptions = {}) {
    super(message, "envelope_validation", options);
    this.name = "EnvelopeValidationError";
  }
}

export class AgentSpecificValidationError extends LiveAdapterError {
  public constructor(message: string, options: LiveAdapterErrorOptions = {}) {
    super(message, "agent_specific_validation", options);
    this.name = "AgentSpecificValidationError";
  }
}

export function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallbackMessage;
}
