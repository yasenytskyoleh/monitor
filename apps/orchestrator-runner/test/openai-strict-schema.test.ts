import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  ESCALATION_SCHEMA,
  normalizeNullableFields,
  nullableSchema,
  strictObjectSchema
} from "../src/adapters/live/schemas/openai-strict-schema.js";

test("strictObjectSchema sets additionalProperties=false and requires all property keys", () => {
  const schema = strictObjectSchema({
    alpha: { type: "string" },
    beta: { type: "number" }
  }) as Record<string, unknown>;

  assert.equal(schema.type, "object");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ["alpha", "beta"]);
});

test("nullableSchema wraps schema with null branch", () => {
  const schema = nullableSchema({ type: "string" }) as Record<string, unknown>;
  const anyOf = schema.anyOf as unknown[];
  assert.equal(anyOf.length, 2);
});

test("normalizeNullableFields removes null placeholders", () => {
  const payload: Record<string, unknown> = {
    a: 1,
    b: null,
    c: "x"
  };

  normalizeNullableFields(payload, ["b", "missing"]);
  assert.deepEqual(payload, {
    a: 1,
    c: "x"
  });
});

test("shared escalation schema keeps strict object contract", () => {
  const schema = ESCALATION_SCHEMA as Record<string, unknown>;
  const anyOf = schema.anyOf as Array<Record<string, unknown>>;
  assert.equal(anyOf.length, 2);

  const escalationObject = anyOf[0] as Record<string, unknown>;
  assert.equal(escalationObject.type, "object");
  assert.equal(escalationObject.additionalProperties, false);
  assert.ok(Array.isArray(escalationObject.required));
});
