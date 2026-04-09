export type JsonSchema = Record<string, unknown>;

export function strictObjectSchema(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties)
  };
}

export function nullableSchema(schema: JsonSchema): JsonSchema {
  return {
    anyOf: [schema, { type: "null" }]
  };
}

export const ESCALATION_SCHEMA = nullableSchema(
  strictObjectSchema({
    taskId: { type: "string", minLength: 1 },
    agentRole: {
      type: "string",
      enum: ["PRODUCT", "ARCHITECT", "BACKEND", "QUANT_PATTERN", "DOCS_REVIEWER"]
    },
    workflowState: { type: "string", minLength: 1 },
    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    reason: { type: "string", minLength: 1 },
    riskNotes: {
      type: "array",
      minItems: 1,
      items: { type: "string", minLength: 1 }
    },
    requestedDecision: { type: "string", minLength: 1 },
    recommendedNextAction: { type: "string", minLength: 1 },
    relatedApprovalType: { type: "string", enum: ["ARCHITECTURE", "SIGNAL_PUBLISH"] },
    relatedContractRefs: {
      type: "array",
      items: { type: "string", minLength: 1 }
    }
  })
);

export function normalizeNullableFields(data: unknown, fields: string[]): void {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return;
  }

  const record = data as Record<string, unknown>;
  for (const field of fields) {
    if (record[field] === null) {
      delete record[field];
    }
  }
}
