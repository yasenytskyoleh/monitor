import { ESCALATION_SCHEMA, nullableSchema, strictObjectSchema } from "./openai-strict-schema.js";

export const ARCHITECT_RESPONSE_SCHEMA: Record<string, unknown> = strictObjectSchema({
  taskId: { type: "string", minLength: 1 },
  agentRole: { type: "string", enum: ["ARCHITECT"] },
  status: { type: "string", enum: ["completed", "blocked", "needs_escalation", "rejected"] },
  summary: { type: "string", minLength: 1 },
  artifacts: {
    type: "array",
    minItems: 1,
    uniqueItems: true,
    items: { type: "string", enum: ["architecture-design", "adr-draft"] }
  },
  nextAction: {
    type: "string",
    enum: ["handoff_to_quant", "await_approval", "request_more_context", "reject_task"]
  },
  risks: nullableSchema({
    type: "array",
    items: { type: "string", minLength: 1 }
  }),
  notes: nullableSchema({
    anyOf: [
      { type: "string", minLength: 1 },
      {
        type: "array",
        items: { type: "string", minLength: 1 }
      }
    ]
  }),
  metrics: nullableSchema(
    strictObjectSchema({
      moduleBoundaries: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      dataFlow: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      contractDefinitions: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      adrDraft: { type: "string", minLength: 1 },
      riskNotes: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      }
    })
  ),
  escalation: ESCALATION_SCHEMA
});
