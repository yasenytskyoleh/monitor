import type { OutputFormat, RunnerOutput } from "./types.js";

export function formatRunnerOutput(result: RunnerOutput, format: OutputFormat = "text"): string {
  if (format === "json") {
    return JSON.stringify(
      {
        status: result.status,
        runId: result.runId ?? null,
        finalState: result.taskState,
        outcome: result.outcome ?? outcomeFromState(result.taskState),
        reason: result.reason ?? null,
        artifactsPath: result.artifactsPath ?? null,
        agentModes: result.agentModes ?? null,
        transitionLogPath: result.transitionLogPath,
        transitionsCount: result.transitions.length,
        patchPlansCount: result.patchPlans.length,
        patchResultsCount: result.patchResults.length,
        rollbackPlansCount: result.rollbackPlans.length,
        rollbackResultsCount: result.rollbackResults.length,
        verificationResultsCount: result.verificationResults.length,
        scenarios:
          result.scenarios?.map((scenario) => ({
            scenario: scenario.scenario,
            finalState: scenario.finalState,
            transitionLogPath: scenario.transitionLogPath,
            blockedTransition: scenario.blockedTransition ?? null,
            transitionsCount: scenario.transitions.length
          })) ?? []
      },
      null,
      2
    );
  }

  const lines: string[] = [];
  lines.push("Run completed");
  if (result.runId) {
    lines.push(`Run ID: ${result.runId}`);
  }
  lines.push(`Final state: ${result.taskState}`);
  lines.push(`Outcome: ${result.outcome ?? outcomeFromState(result.taskState)}`);
  if (result.reason) {
    lines.push(`Reason: ${result.reason}`);
  }
  if (result.artifactsPath) {
    lines.push(`Artifacts: ${result.artifactsPath}`);
  }

  return lines.join("\n");
}

export function assertSuccessfulResult(result: RunnerOutput): void {
  if (Array.isArray(result.scenarios) && result.scenarios.length > 0) {
    for (const scenario of result.scenarios) {
      if (!isSuccessTerminalState(scenario.finalState)) {
        throw new Error(
          `Scenario '${scenario.scenario}' ended in non-terminal state '${scenario.finalState}'`
        );
      }
    }
    return;
  }

  if (!isSuccessTerminalState(result.taskState)) {
    throw new Error(`Run ended in non-terminal state '${result.taskState}'`);
  }
}

export function handleCliError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);

  const details = getErrorDetails(error);
  if (details.length > 0) {
    process.stderr.write("Details:\n");
    for (const detail of details) {
      process.stderr.write(`- ${detail}\n`);
    }
  }

  process.exitCode = 1;
}

function outcomeFromState(state: string): "success" | "policy_rejection" | "incomplete" {
  if (state === "DONE") {
    return "success";
  }
  if (state === "REJECTED") {
    return "policy_rejection";
  }
  return "incomplete";
}

function isSuccessTerminalState(state: string): boolean {
  return state === "DONE" || state === "REJECTED";
}

function getErrorDetails(error: unknown): string[] {
  if (!error || typeof error !== "object") {
    return [];
  }

  const maybeDetails = (error as { details?: unknown }).details;
  if (!Array.isArray(maybeDetails)) {
    return [];
  }

  return maybeDetails.filter((detail): detail is string => typeof detail === "string" && detail.trim().length > 0);
}
