import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isBackendPatchError } from "../src/backend-patch/errors.js";
import { runBackendVerificationHooks } from "../src/backend-verification/run-verification-hooks.js";

test("verification hooks pass for apply + lint", async () => {
  const result = await runBackendVerificationHooks({
    mode: "lint",
    cwd: "/tmp",
    applied: true,
    runner: async () => ({
      exitCode: 0,
      timedOut: false,
      stdout: "lint ok",
      stderr: "",
      durationMs: 120
    })
  });

  assert.equal(result.overallStatus, "passed");
  assert.deepEqual(result.hooksRequested, ["lint"]);
  assert.equal(result.hooksExecuted.length, 1);
  assert.equal(result.hooksExecuted[0]?.status, "passed");
});

test("verification hooks fail on typecheck failure", async () => {
  const calls: string[] = [];

  await assert.rejects(
    () =>
      runBackendVerificationHooks({
        mode: "lint+typecheck",
        cwd: "/tmp",
        applied: true,
        runner: async ({ command }) => {
          const hook = command.includes("typecheck") ? "typecheck" : "lint";
          calls.push(hook);
          if (hook === "typecheck") {
            return {
              exitCode: 2,
              timedOut: false,
              stdout: "",
              stderr: "typecheck failed",
              durationMs: 300
            };
          }
          return {
            exitCode: 0,
            timedOut: false,
            stdout: "lint ok",
            stderr: "",
            durationMs: 100
          };
        }
      }),
    (error: unknown) => isBackendPatchError(error) && error.failureCategory === "typecheck_failed"
  );

  assert.deepEqual(calls, ["lint", "typecheck"]);
});

test("verification hooks fail on test failure", async () => {
  await assert.rejects(
    () =>
      runBackendVerificationHooks({
        mode: "lint+typecheck+test",
        cwd: "/tmp",
        applied: true,
        runner: async ({ command }) => ({
          exitCode: command.includes("test") ? 1 : 0,
          timedOut: false,
          stdout: "",
          stderr: command.includes("test") ? "test failed" : "",
          durationMs: 200
        })
      }),
    (error: unknown) => isBackendPatchError(error) && error.failureCategory === "test_failed"
  );
});

test("verification hook timeout is reported", async () => {
  await assert.rejects(
    () =>
      runBackendVerificationHooks({
        mode: "lint",
        cwd: "/tmp",
        applied: true,
        runner: async () => ({
          exitCode: null,
          timedOut: true,
          stdout: "",
          stderr: "",
          durationMs: 121_000
        })
      }),
    (error: unknown) => isBackendPatchError(error) && error.failureCategory === "verification_timeout"
  );
});

test("dry-run skips verification hooks", async () => {
  const result = await runBackendVerificationHooks({
    mode: "lint+typecheck+test",
    cwd: "/tmp",
    applied: false
  });

  assert.equal(result.overallStatus, "skipped");
  assert.equal(result.hooksExecuted.length, 0);
});

test("unknown verification mode is rejected", async () => {
  await assert.rejects(
    () =>
      runBackendVerificationHooks({
        mode: "invalid" as "none",
        cwd: "/tmp",
        applied: true
      }),
    /Unknown backend verification mode/
  );
});
