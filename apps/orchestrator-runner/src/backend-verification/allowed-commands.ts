import {
  type BackendVerificationHook,
  type BackendVerificationHookName,
  type BackendVerificationMode
} from "./types.js";

const DEFAULT_TIMEOUT_MS: Record<BackendVerificationHookName, number> = {
  lint: 120_000,
  typecheck: 180_000,
  test: 240_000
};

const DEFAULT_COMMANDS: Record<BackendVerificationHookName, string[]> = {
  lint: ["pnpm", "--filter", "@monitor/orchestrator-runner", "lint"],
  typecheck: ["pnpm", "--filter", "@monitor/orchestrator-runner", "typecheck"],
  test: ["pnpm", "--filter", "@monitor/orchestrator-runner", "test"]
};

export function resolveBackendVerificationHooks(mode: BackendVerificationMode): BackendVerificationHook[] {
  if (mode === "none") {
    return [];
  }

  const names: BackendVerificationHookName[] =
    mode === "lint"
      ? ["lint"]
      : mode === "lint+typecheck"
        ? ["lint", "typecheck"]
        : mode === "lint+typecheck+test"
          ? ["lint", "typecheck", "test"]
          : (() => {
              throw new Error(`Unknown backend verification mode '${mode}'`);
            })();

  return names.map((name) => ({
    name,
    command: [...DEFAULT_COMMANDS[name]],
    timeoutMs: DEFAULT_TIMEOUT_MS[name]
  }));
}
