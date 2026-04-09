import type { RunnerOutput } from "./types.js";

export function formatRunnerOutput(result: RunnerOutput): string {
  const lines: string[] = [];
  lines.push("Run completed");

  if (Array.isArray(result.scenarios) && result.scenarios.length > 0) {
    for (const scenario of result.scenarios) {
      lines.push(`Scenario: ${scenario.scenario}`);
      lines.push(`Final state: ${scenario.finalState}`);
      lines.push(`Outcome: ${outcomeFromState(scenario.finalState)}`);
      lines.push(`Transitions: ${scenario.transitions.length}`);
      lines.push(`Transition log: ${scenario.transitionLogPath}`);
      if (scenario.blockedTransition) {
        lines.push(
          `Blocked transition: ${scenario.blockedTransition.from} -> ${scenario.blockedTransition.to}`
        );
        lines.push(`Reason: ${scenario.blockedTransition.error}`);
      }
    }
  } else {
    lines.push(`Final state: ${result.taskState}`);
    lines.push(`Outcome: ${outcomeFromState(result.taskState)}`);
    lines.push(`Transitions: ${result.transitions.length}`);
    lines.push(`Transition log: ${result.transitionLogPath}`);
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
