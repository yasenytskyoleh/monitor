import { ESCALATION_SCHEMA, nullableSchema, strictObjectSchema } from "./openai-strict-schema.js";

export const QUANT_PATTERN_RESPONSE_SCHEMA: Record<string, unknown> = strictObjectSchema({
  taskId: { type: "string", minLength: 1 },
  agentRole: { type: "string", enum: ["QUANT_PATTERN"] },
  status: { type: "string", enum: ["completed", "blocked", "needs_escalation", "rejected"] },
  summary: { type: "string", minLength: 1 },
  artifacts: {
    type: "array",
    minItems: 1,
    items: { type: "string", minLength: 1 }
  },
  nextAction: {
    type: "string",
    enum: ["handoff_to_backend", "request_more_context", "reject_task"]
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
      patternDefinition: { type: "string", minLength: 1 },
      measurableConditions: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      metricsPlan: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      evaluationHorizon: { type: "string", minLength: 1 },
      invalidationAssumptions: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      edgeHypothesis: { type: "string", minLength: 1 },
      testScenarios: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 }
      },
      phaseScope: strictObjectSchema({
        marketType: { type: "string", enum: ["SPOT_ONLY"] },
        leverage: { type: "string", enum: ["NONE"] },
        fundingRateDependency: { type: "string", enum: ["NOT_REQUIRED"] },
        derivatives: { type: "string", enum: ["NONE"] }
      })
    })
  ),
  escalation: ESCALATION_SCHEMA
});
