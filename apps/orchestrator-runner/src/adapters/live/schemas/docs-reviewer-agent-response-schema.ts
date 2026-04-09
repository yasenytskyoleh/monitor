import { ESCALATION_SCHEMA, nullableSchema, strictObjectSchema } from "./openai-strict-schema.js";

export const DOCS_REVIEWER_RESPONSE_SCHEMA: Record<string, unknown> = strictObjectSchema({
  taskId: { type: "string", minLength: 1 },
  agentRole: { type: "string", enum: ["DOCS_REVIEWER"] },
  status: { type: "string", enum: ["completed", "blocked", "needs_escalation", "rejected"] },
  summary: { type: "string", minLength: 1 },
  artifacts: {
    type: "array",
    minItems: 1,
    items: { type: "string", minLength: 1 }
  },
  nextAction: {
    type: "string",
    enum: ["await_approval", "return_to_implement", "reject_task"]
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
      docsUpdates: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      reviewFindings: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      changelogNotes: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      traceabilityConfirmation: strictObjectSchema({
        isTraceable: { type: "boolean" },
        notes: {
          type: "array",
          minItems: 1,
          items: { type: "string", minLength: 1 }
        }
      }),
      missingArtifactWarnings: {
        type: "array",
        items: { type: "string", minLength: 1 }
      },
      driftWarnings: {
        type: "array",
        items: { type: "string", minLength: 1 }
      }
    })
  ),
  escalation: ESCALATION_SCHEMA
});

