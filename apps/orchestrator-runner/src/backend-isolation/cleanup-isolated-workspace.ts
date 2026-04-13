import { rm } from "node:fs/promises";

import type { IsolatedWorkspaceCleanupResult } from "./types.js";

export async function cleanupIsolatedWorkspace(input: {
  workspaceRoot: string;
  keepWorkspace?: boolean;
}): Promise<IsolatedWorkspaceCleanupResult> {
  if (input.keepWorkspace === true) {
    return {
      status: "skipped",
      failureReason: "Isolated workspace cleanup skipped by keepWorkspace=true"
    };
  }

  try {
    await rm(input.workspaceRoot, { recursive: true, force: true });
    return {
      status: "succeeded",
      failureReason: null
    };
  } catch (error) {
    return {
      status: "failed",
      failureReason: error instanceof Error ? error.message : String(error)
    };
  }
}
