import { getSchemaValidator } from "@monitor/agent-config";
import type { AgentOutputEnvelope } from "@monitor/orchestrator-core";

import { normalizeNullableFields } from "../schemas/openai-strict-schema.js";
import { EnvelopeValidationError, toErrorMessage } from "./errors.js";

export async function validateAgentEnvelopeOutput(input: {
  parsed: unknown;
  context: string;
  nullableFields: string[];
}): Promise<AgentOutputEnvelope> {
  normalizeNullableFields(input.parsed, input.nullableFields);

  try {
    await getSchemaValidator().validateOrThrow(
      "https://monitor/schemas/agent-output-envelope.schema.json",
      input.parsed,
      input.context
    );
  } catch (error) {
    throw new EnvelopeValidationError(toErrorMessage(error, "Envelope schema validation failed"), {
      cause: error
    });
  }

  return input.parsed as AgentOutputEnvelope;
}

export function assertAgentOutputIdentity(
  output: AgentOutputEnvelope,
  options: {
    expectedTaskId: string;
    expectedRole: AgentOutputEnvelope["agentRole"];
    adapterLabel: string;
  }
): void {
  if (output.taskId !== options.expectedTaskId) {
    throw new EnvelopeValidationError(
      `${options.adapterLabel} Agent taskId mismatch: '${output.taskId}' != '${options.expectedTaskId}'`
    );
  }

  if (output.agentRole !== options.expectedRole) {
    throw new EnvelopeValidationError(
      `${options.adapterLabel} Agent role must be '${options.expectedRole}', received '${output.agentRole}'`
    );
  }
}
