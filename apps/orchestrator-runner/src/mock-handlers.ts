import type { AgentHandlers } from "@monitor/orchestrator-core";

export function createMockHandlers(): AgentHandlers {
  return {
    "product-agent": async (context) => ({
      taskId: context.task.taskId,
      agentRole: "PRODUCT",
      status: "completed",
      summary: "Mock product scope prepared",
      artifacts: ["product-brief"],
      nextAction: "handoff_to_architect"
    }),
    "architect-agent": async (context) => {
      if (context.targetState === "REJECTED") {
        return {
          taskId: context.task.taskId,
          agentRole: "ARCHITECT",
          status: "rejected",
          summary: "Mock rejection due to missing architecture approval",
          artifacts: ["rejection-note"],
          nextAction: "reject_task"
        };
      }

      return {
        taskId: context.task.taskId,
        agentRole: "ARCHITECT",
        status: "completed",
        summary: "Mock architecture prepared",
        artifacts: ["adr-draft", "architecture-design"],
        nextAction: "handoff_to_quant"
      };
    },
    "quant-pattern-agent": async (context) => ({
      taskId: context.task.taskId,
      agentRole: "QUANT_PATTERN",
      status: "completed",
      summary: "Mock pattern formalized",
      artifacts: ["pattern-definition", "metrics-plan"],
      nextAction: "handoff_to_backend"
    }),
    "backend-agent": async (context) => ({
      taskId: context.task.taskId,
      agentRole: "BACKEND",
      status: "completed",
      summary: "Mock implementation complete",
      artifacts: ["code-change", "implementation-notes", "tests"],
      nextAction: "handoff_to_docs_reviewer"
    }),
    "docs-reviewer-agent": async (context) => ({
      taskId: context.task.taskId,
      agentRole: "DOCS_REVIEWER",
      status: "completed",
      summary: "Mock review complete",
      artifacts: ["review-report", "docs-update"],
      nextAction: "await_approval"
    })
  };
}
