import assert from "node:assert/strict";
import test from "node:test";

/**
 * Both bounded jobs used to call `run()` at module scope, so importing either one started a real
 * job against the configured database. They are now guarded, which is what makes them importable
 * at all — these tests exist to keep that true.
 */
test("importing the evaluator does not start a job", async () => {
  const evaluate = await import("../src/evaluate.js");

  assert.equal(typeof evaluate.run, "function");
});

test("importing the notifier does not start a job or require Telegram credentials", async () => {
  const notify = await import("../src/notify.js");

  assert.equal(typeof notify.run, "function");
});
