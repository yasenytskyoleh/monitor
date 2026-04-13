import { spawn } from "node:child_process";

import { BackendPatchError } from "../backend-patch/errors.js";
import { resolveBackendVerificationHooks } from "./allowed-commands.js";
import type {
  BackendVerificationCommandResult,
  BackendVerificationCommandRunner,
  BackendVerificationHook,
  BackendVerificationMode,
  BackendVerificationResult
} from "./types.js";

export type RunBackendVerificationHooksInput = {
  mode: BackendVerificationMode;
  cwd: string;
  applied: boolean;
  runner?: BackendVerificationCommandRunner;
};

export async function runBackendVerificationHooks(
  input: RunBackendVerificationHooksInput
): Promise<BackendVerificationResult> {
  if (!input.applied || input.mode === "none") {
    return {
      applied: input.applied,
      hooksRequested: [],
      hooksExecuted: [],
      overallStatus: "skipped"
    };
  }

  const hooks = resolveBackendVerificationHooks(input.mode);
  const hooksExecuted: BackendVerificationResult["hooksExecuted"] = [];
  const runner = input.runner ?? runAllowedCommand;

  for (const hook of hooks) {
    const result = await runner({
      command: hook.command,
      cwd: input.cwd,
      timeoutMs: hook.timeoutMs
    });

    hooksExecuted.push(mapHookResult(hook, result));

    if (result.timedOut) {
      const verificationResult: BackendVerificationResult = {
        applied: input.applied,
        hooksRequested: hooks.map((item) => item.name),
        hooksExecuted,
        overallStatus: "failed"
      };
      throw new BackendPatchError(
        "verification_timeout",
        `Backend verification hook '${hook.name}' timed out after ${hook.timeoutMs}ms`,
        {
          metadata: {
            verificationResult
          }
        }
      );
    }

    if (result.exitCode !== 0) {
      const verificationResult: BackendVerificationResult = {
        applied: input.applied,
        hooksRequested: hooks.map((item) => item.name),
        hooksExecuted,
        overallStatus: "failed"
      };
      throw new BackendPatchError(
        hookFailureCategory(hook.name),
        `Backend verification hook '${hook.name}' failed with exit code ${String(result.exitCode)}`,
        {
          metadata: {
            verificationResult
          }
        }
      );
    }
  }

  return {
    applied: input.applied,
    hooksRequested: hooks.map((hook) => hook.name),
    hooksExecuted,
    overallStatus: "passed"
  };
}

function mapHookResult(
  hook: BackendVerificationHook,
  result: BackendVerificationCommandResult
): BackendVerificationResult["hooksExecuted"][number] {
  return {
    name: hook.name,
    status: result.timedOut ? "timed_out" : result.exitCode === 0 ? "passed" : "failed",
    command: hook.command.join(" "),
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    ...(result.stdout.trim().length > 0 ? { stdoutSummary: summarize(result.stdout) } : {}),
    ...(result.stderr.trim().length > 0 ? { stderrSummary: summarize(result.stderr) } : {})
  };
}

async function runAllowedCommand(input: {
  command: string[];
  cwd: string;
  timeoutMs: number;
}): Promise<BackendVerificationCommandResult> {
  const command = input.command[0];
  if (!command) {
    throw new BackendPatchError("patch_validation_failure", "Verification command is empty");
  }

  const args = input.command.slice(1);
  const start = Date.now();

  return await new Promise<BackendVerificationCommandResult>((resolve) => {
    const child = spawn(command, args, {
      cwd: input.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, input.timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        timedOut,
        stdout,
        stderr,
        durationMs: Date.now() - start
      });
    });
  });
}

function summarize(value: string): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  return normalized.length > 300 ? `${normalized.slice(0, 297)}...` : normalized;
}

function hookFailureCategory(name: BackendVerificationHook["name"]):
  | "lint_failed"
  | "typecheck_failed"
  | "test_failed" {
  if (name === "lint") {
    return "lint_failed";
  }
  if (name === "typecheck") {
    return "typecheck_failed";
  }
  return "test_failed";
}
