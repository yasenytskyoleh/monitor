import { ESCALATION_SCHEMA, nullableSchema, strictObjectSchema } from "./openai-strict-schema.js";

export const BACKEND_RESPONSE_SCHEMA: Record<string, unknown> = strictObjectSchema({
  taskId: { type: "string", minLength: 1 },
  agentRole: { type: "string", enum: ["BACKEND"] },
  status: { type: "string", enum: ["completed", "blocked", "needs_escalation", "rejected"] },
  summary: { type: "string", minLength: 1 },
  artifacts: {
    type: "array",
    minItems: 1,
    items: { type: "string", minLength: 1 }
  },
  nextAction: {
    type: "string",
    enum: [
      "handoff_to_docs_reviewer",
      "request_architecture_clarification",
      "request_more_context",
      "await_approval",
      "reject_task"
    ]
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
      changePlan: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      targetFiles: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      changeType: {
        type: "string",
        enum: ["patch_only", "new_file", "test_only", "docs_only"]
      },
      requiresSchemaChange: { type: "boolean" },
      requiresArchitectureChange: { type: "boolean" },
      requiresMigration: { type: "boolean" },
      proposedDiffs: {
        type: "array",
        minItems: 1,
        items: strictObjectSchema({
          filePath: { type: "string", minLength: 1 },
          operation: { type: "string", enum: ["create", "update"] },
          content: { type: "string", minLength: 1 }
        })
      },
      testsPlan: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      knownLimitations: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      }
    })
  ),
  escalation: ESCALATION_SCHEMA
});
