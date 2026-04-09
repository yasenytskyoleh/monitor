import * as assert from "node:assert/strict";
import { test } from "node:test";

import { parseAgentModeOverrides, resolveAgentExecutionMap } from "../src/handlers/agent-modes.js";

test("resolveAgentExecutionMap maps all agents to mock for mode=mock", () => {
  const resolved = resolveAgentExecutionMap("mock", {});

  assert.deepEqual(resolved, {
    "product-agent": "mock",
    "architect-agent": "mock",
    "quant-pattern-agent": "mock",
    "backend-agent": "mock",
    "docs-reviewer-agent": "mock"
  });
});

test("resolveAgentExecutionMap mode=mock with product override sets only product live", () => {
  const overrides = parseAgentModeOverrides("product=live");
  const resolved = resolveAgentExecutionMap("mock", overrides);

  assert.equal(resolved["product-agent"], "live");
  assert.equal(resolved["architect-agent"], "mock");
  assert.equal(resolved["quant-pattern-agent"], "mock");
  assert.equal(resolved["backend-agent"], "mock");
  assert.equal(resolved["docs-reviewer-agent"], "mock");
});

test("resolveAgentExecutionMap mode=live defaults only implemented live agents to live", () => {
  const resolved = resolveAgentExecutionMap("live", {});

  assert.equal(resolved["product-agent"], "live");
  assert.equal(resolved["architect-agent"], "mock");
  assert.equal(resolved["quant-pattern-agent"], "mock");
  assert.equal(resolved["backend-agent"], "mock");
  assert.equal(resolved["docs-reviewer-agent"], "mock");
});

test("resolveAgentExecutionMap rejects unsupported live override", () => {
  const overrides = parseAgentModeOverrides("architect=live");
  assert.throws(
    () => resolveAgentExecutionMap("mock", overrides),
    /no live handler is implemented/
  );
});
