import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { isDirectExecution } from "../src/direct-execution.js";

test("a missing script path does not trigger an imported entrypoint", () => {
  assert.equal(isDirectExecution(import.meta.url, ""), false);
  assert.equal(isDirectExecution(import.meta.url, join(tmpdir(), "missing-btc-entrypoint.mjs")), false);
});

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

test("a directly launched module runs from a path with spaces and a hash", () => {
  const directory = mkdtempSync(join(tmpdir(), "btc entrypoint with spaces-"));
  try {
    const scriptPath = join(directory, "run #1.mjs");
    const helperUrl = new URL("../src/direct-execution.ts", import.meta.url).href;
    writeFileSync(scriptPath,
      `import { isDirectExecution } from ${JSON.stringify(helperUrl)};\n` +
      `if (!isDirectExecution(import.meta.url)) {\n` +
      `  console.error(JSON.stringify({ scriptPath: process.argv[1], moduleUrl: import.meta.url }));\n` +
      `  process.exitCode = 7;\n` +
      `}\n`
    );
    const result = spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
