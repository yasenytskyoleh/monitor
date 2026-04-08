import { PermissionDeniedError } from "./errors.js";
import type { ResolvedAgentConfig } from "./types.js";

type AgentPermissionContext = Pick<ResolvedAgentConfig, "id" | "permissions">;

export function isActionAllowed(agent: AgentPermissionContext, action: string): boolean {
  return agent.permissions.allow.includes(action);
}

export function assertActionAllowed(agent: AgentPermissionContext, action: string): void {
  if (!isActionAllowed(agent, action)) {
    throw new PermissionDeniedError(`Action '${action}' is not allowlisted for agent '${agent.id}'`);
  }
}
