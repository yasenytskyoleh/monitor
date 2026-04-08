import { join } from "node:path";

import { APPROVAL_TYPES, AGENT_ROLES, PERMISSION_ACTIONS } from "./constants.js";
import { ConfigSemanticError } from "./errors.js";
import { fileExists } from "./io.js";
import type { AgentRole, MergedConfig, WorkflowTransition } from "./types.js";
import { transitionKey } from "./utils.js";

type ValidateSemanticsOptions = {
  config: MergedConfig;
  promptsRootDir: string;
};

export async function validateSemantics(options: ValidateSemanticsOptions): Promise<void> {
  const errors: string[] = [];

  validateAgentIds(options.config, errors);
  validatePermissionAllowlist(options.config, errors);
  await validatePromptReferences(options.config, options.promptsRootDir, errors);
  validateWorkflowGraph(options.config, errors);
  validateStateOwnership(options.config, errors);

  if (errors.length > 0) {
    throw new ConfigSemanticError("Semantic validation failed", errors);
  }
}

function validateAgentIds(config: MergedConfig, errors: string[]): void {
  const seen = new Set<string>();

  for (const agent of config.agents) {
    if (seen.has(agent.id)) {
      errors.push(`Duplicate agent id detected: ${agent.id}`);
      continue;
    }

    seen.add(agent.id);
  }
}

function validatePermissionAllowlist(config: MergedConfig, errors: string[]): void {
  const knownActions = new Set<string>(PERMISSION_ACTIONS);

  for (const agent of config.agents) {
    for (const permission of agent.permissions.allow) {
      if (!knownActions.has(permission)) {
        errors.push(`Unknown permission action '${permission}' for agent '${agent.id}'`);
      }
    }
  }
}

async function validatePromptReferences(config: MergedConfig, promptsRootDir: string, errors: string[]): Promise<void> {
  for (const agent of config.agents) {
    const promptPath = join(promptsRootDir, agent.prompt.version, agent.prompt.template);
    if (!(await fileExists(promptPath))) {
      errors.push(`Missing prompt template for agent '${agent.id}': ${promptPath}`);
    }
  }
}

function validateWorkflowGraph(config: MergedConfig, errors: string[]): void {
  const states = new Set<string>(config.workflow.states);
  const terminalStates = new Set<string>(config.workflow.terminalStates);

  if (!states.has(config.workflow.initialState)) {
    errors.push(`Workflow initial state '${config.workflow.initialState}' is not in states list`);
  }

  for (const terminalState of config.workflow.terminalStates) {
    if (!states.has(terminalState)) {
      errors.push(`Workflow terminal state '${terminalState}' is not in states list`);
    }
  }

  const transitionMap = new Map<string, WorkflowTransition>();

  for (const transition of config.workflow.transitions) {
    const key = transitionKey(transition.from, transition.to);

    if (transitionMap.has(key)) {
      errors.push(`Duplicate transition detected: ${transition.from} -> ${transition.to}`);
    }

    if (!states.has(transition.from)) {
      errors.push(`Transition references undefined 'from' state: ${transition.from}`);
    }

    if (!states.has(transition.to)) {
      errors.push(`Transition references undefined 'to' state: ${transition.to}`);
    }

    if (terminalStates.has(transition.from)) {
      errors.push(`Terminal state '${transition.from}' cannot have outbound transitions`);
    }

    if (transition.requiresApproval) {
      if (!transition.approvalType) {
        errors.push(`Transition ${transition.from} -> ${transition.to} requires approvalType`);
      } else if (!APPROVAL_TYPES.includes(transition.approvalType)) {
        errors.push(`Transition ${transition.from} -> ${transition.to} has invalid approvalType`);
      }
    }

    transitionMap.set(key, transition);
  }

  for (const reentryKey of Object.keys(config.workflow.reentryRules ?? {})) {
    const [from, to] = reentryKey.split("->");
    if (!from || !to) {
      errors.push(`Reentry rule key '${reentryKey}' must follow FROM->TO format`);
      continue;
    }

    if (!transitionMap.has(transitionKey(from, to))) {
      errors.push(`Reentry rule '${reentryKey}' references a transition that is not defined`);
    }
  }

  const reachableStates = new Set<string>();
  const queue: string[] = [config.workflow.initialState];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || reachableStates.has(current)) {
      continue;
    }

    reachableStates.add(current);

    for (const transition of transitionMap.values()) {
      if (transition.from !== current) {
        continue;
      }

      if (!reachableStates.has(transition.to)) {
        queue.push(transition.to);
      }
    }
  }

  for (const state of states) {
    if (!reachableStates.has(state)) {
      errors.push(`Unreachable workflow state detected: ${state}`);
    }
  }
}

function validateStateOwnership(config: MergedConfig, errors: string[]): void {
  const validOwners = new Set<string>([...AGENT_ROLES, "HUMAN", "SYSTEM", "TERMINAL"]);
  const workflowStates = new Set<string>(config.workflow.states);
  const terminalStates = new Set<string>(config.workflow.terminalStates);

  if (!config.workflow.stateOwners) {
    errors.push("Workflow stateOwners is required and cannot be empty");
    return;
  }

  for (const [state, owner] of Object.entries(config.workflow.stateOwners)) {
    if (!workflowStates.has(state)) {
      errors.push(`State owner mapping references unknown state: ${state}`);
    }

    if (!validOwners.has(owner)) {
      errors.push(`State owner '${owner}' for state '${state}' is not recognized`);
    }

    if (terminalStates.has(state) && owner !== "TERMINAL") {
      errors.push(`Terminal state '${state}' must be owned by 'TERMINAL'`);
    }

    if (!terminalStates.has(state) && owner === "TERMINAL") {
      errors.push(`Non-terminal state '${state}' cannot be owned by 'TERMINAL'`);
    }
  }

  for (const state of workflowStates) {
    if (!Object.hasOwn(config.workflow.stateOwners, state)) {
      errors.push(`State '${state}' is missing an owner mapping`);
    }
  }

  const ownedStatesByRole = new Map<AgentRole, Set<string>>();

  for (const agent of config.agents) {
    if (!ownedStatesByRole.has(agent.role)) {
      ownedStatesByRole.set(agent.role, new Set<string>());
    }

    const roleStates = ownedStatesByRole.get(agent.role);

    for (const ownedState of agent.ownsStates) {
      if (!workflowStates.has(ownedState)) {
        errors.push(`Agent '${agent.id}' owns unknown state '${ownedState}'`);
      }

      if (roleStates) {
        roleStates.add(ownedState);
      }

      const mappedOwner = config.workflow.stateOwners[ownedState];
      if (mappedOwner && mappedOwner !== agent.role) {
        errors.push(
          `State ownership mismatch for '${ownedState}': workflow owner '${mappedOwner}', agent '${agent.id}' role '${agent.role}'`
        );
      }
    }
  }

  for (const [state, owner] of Object.entries(config.workflow.stateOwners)) {
    if (!AGENT_ROLES.includes(owner as AgentRole)) {
      continue;
    }

    const roleOwnedStates = ownedStatesByRole.get(owner as AgentRole);
    if (!roleOwnedStates || !roleOwnedStates.has(state)) {
      errors.push(`State '${state}' is owned by role '${owner}' in workflow but no agent declares ownership`);
    }
  }
}
