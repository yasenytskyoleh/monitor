#!/usr/bin/env node
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { runResearchWorkflowCli } from "./runner.js";

export {
  parseResearchWorkflowCommand,
  type ExecutePreparedEnvelopeCommand,
  type PrepareRoutedActionCommand,
  type ResearchWorkflowCommand,
  type RouteResearchDecisionCommand,
} from "./cli.js";
export {
  createDownstreamActionExecutorDispatcher,
  type DownstreamActionExecutorDispatcherOptions,
} from "./downstream-action-executor-dispatcher.js";
export {
  createResearchWorkflowExecutionRuntime,
  createResearchWorkflowPreparationRuntime,
  createResearchWorkflowRoutingRuntime,
  createResearchWorkflowRuntime,
  type ResearchWorkflowRepositories,
  type ResearchWorkflowRuntime,
  type ResearchWorkflowRuntimeOptions,
} from "./research-workflow-runtime.js";
export {
  executeResearchWorkflowCommand,
  runResearchWorkflowCli,
  type ResearchWorkflowCommandResult,
} from "./runner.js";

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  void runResearchWorkflowCli()
    .then((result) => {
      if (
        ["failed", "rejected", "rejected_lifecycle", "rejected_validation"].includes(
          result.status,
        )
      ) {
        process.exitCode = 1;
      }
    })
    .catch((error: unknown) => {
      process.stderr.write(
        `${JSON.stringify({
          kind: "research_workflow_error",
          message: error instanceof Error ? error.message : "research workflow command failed",
        })}\n`,
      );
      process.exitCode = 1;
    });
}
