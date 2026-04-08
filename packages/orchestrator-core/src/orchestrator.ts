import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  assertTransitionAllowed,
  getSchemaValidator
} from "@monitor/agent-config";
import type { RuntimeConfigSnapshot } from "@monitor/agent-config";

import { OrchestratorConfigError, OrchestratorExecutionError } from "./errors.js";
import type {
  AgentHandlers,
  AgentOutputEnvelope,
  TaskEnvelope,
  TransitionInput,
  TransitionRecord,
  TransitionResult,
  OrchestratorOptions
} from "./types.js";
import { createChecksum, uniqueStrings } from "./utils.js";

const SCHEMA_IDS = {
  taskEnvelope: "https://monitor/schemas/task-envelope.schema.json",
  agentOutputEnvelope: "https://monitor/schemas/agent-output-envelope.schema.json",
  transitionRecord: "https://monitor/schemas/transition-record.schema.json"
} as const;

const NON_AGENT_OWNERS = new Set(["HUMAN", "SYSTEM", "TERMINAL"]);

export class OrchestratorCore {
  private readonly handlers: AgentHandlers;
  private readonly transitionLogPath?: string;
  private readonly executedBy: string;
  private readonly transitions: TransitionRecord[] = [];

  private constructor(
    private readonly snapshot: RuntimeConfigSnapshot,
    options: Omit<OrchestratorOptions, "snapshotPath">
  ) {
    this.handlers = options.handlers ?? {};
    this.transitionLogPath = options.transitionLogPath;
    this.executedBy = options.executedBy ?? "orchestrator-core";
  }

  public static async fromSnapshotFile(options: OrchestratorOptions): Promise<OrchestratorCore> {
    const rawSnapshot = await readFile(options.snapshotPath, "utf8");
    const parsedSnapshot = JSON.parse(rawSnapshot) as RuntimeConfigSnapshot;
    assertRuntimeSnapshot(parsedSnapshot, options.snapshotPath);
    return new OrchestratorCore(parsedSnapshot, {
      handlers: options.handlers,
      transitionLogPath: options.transitionLogPath,
      executedBy: options.executedBy
    });
  }

  public getSnapshot(): RuntimeConfigSnapshot {
    return this.snapshot;
  }

  public getTransitionHistory(): TransitionRecord[] {
    return this.transitions.map((transition) => ({ ...transition }));
  }

  public async transition(input: TransitionInput): Promise<TransitionResult> {
    await this.validateSchema(SCHEMA_IDS.taskEnvelope, input.task, "task envelope");
    this.assertCurrentState(input.task.workflowState);

    assertTransitionAllowed(this.snapshot.workflow, {
      from: input.task.workflowState,
      to: input.to,
      approvalRef: input.approvalRef,
      nowUtc: input.nowUtc
    });

    const owner = this.snapshot.workflow.stateOwners[input.task.workflowState];
    const output = await this.executeOwnerStep(owner, input.task, input.to);

    const mergedArtifacts = uniqueStrings([
      ...input.task.artifactRefs,
      ...(output?.artifacts ?? []),
      ...(input.additionalArtifacts ?? [])
    ]);

    this.assertRequiredArtifacts(input.to, mergedArtifacts);

    const transitionRecord = await this.createTransitionRecord({
      input,
      artifactRefs: mergedArtifacts,
      output
    });

    await this.appendTransitionLog(transitionRecord);
    this.transitions.push(transitionRecord);

    return {
      task: {
        ...input.task,
        workflowState: input.to,
        artifactRefs: mergedArtifacts,
        configVersion: this.snapshot.version
      },
      output,
      transition: transitionRecord
    };
  }

  private assertCurrentState(state: string): void {
    if (!this.snapshot.workflow.states.includes(state)) {
      throw new OrchestratorExecutionError(`Unknown workflow state: ${state}`);
    }
  }

  private async executeOwnerStep(
    owner: string | undefined,
    task: TaskEnvelope,
    toState: string
  ): Promise<AgentOutputEnvelope | undefined> {
    if (!owner) {
      throw new OrchestratorConfigError(`No owner defined for state '${task.workflowState}'`);
    }

    if (NON_AGENT_OWNERS.has(owner)) {
      return undefined;
    }

    const agent = this.snapshot.agents.find((candidate) => candidate.role === owner);
    if (!agent) {
      throw new OrchestratorConfigError(
        `Owner '${owner}' for state '${task.workflowState}' has no matching configured agent`
      );
    }

    const handler = this.handlers[agent.id];
    if (!handler) {
      throw new OrchestratorExecutionError(`Missing handler for agent '${agent.id}'`);
    }

    const output = await handler({
      task,
      targetState: toState,
      snapshot: this.snapshot,
      agent
    });

    await this.validateSchema(SCHEMA_IDS.agentOutputEnvelope, output, `agent output for '${agent.id}'`);

    if (output.taskId !== task.taskId) {
      throw new OrchestratorExecutionError(
        `Agent output taskId mismatch for '${agent.id}': '${output.taskId}' != '${task.taskId}'`
      );
    }

    if (output.agentRole !== agent.role) {
      throw new OrchestratorExecutionError(
        `Agent output role mismatch for '${agent.id}': '${output.agentRole}' != '${agent.role}'`
      );
    }

    return output;
  }

  private assertRequiredArtifacts(toState: string, artifactRefs: string[]): void {
    const requiredArtifacts = this.snapshot.workflow.requiredArtifactsByState?.[toState];
    if (!requiredArtifacts || requiredArtifacts.length === 0) {
      return;
    }

    const missing = requiredArtifacts.filter((artifact) => !artifactRefs.includes(artifact));
    if (missing.length > 0) {
      throw new OrchestratorExecutionError(
        `Missing required artifacts for state '${toState}': ${missing.join(", ")}`
      );
    }
  }

  private async createTransitionRecord(options: {
    input: TransitionInput;
    artifactRefs: string[];
    output?: AgentOutputEnvelope;
  }): Promise<TransitionRecord> {
    const timestampUtc = options.input.nowUtc ?? new Date().toISOString();
    const baseRecord = {
      taskId: options.input.task.taskId,
      from: options.input.task.workflowState,
      to: options.input.to,
      requestedBy: options.input.requestedBy ?? options.input.task.requestedBy,
      executedBy: this.executedBy,
      timestampUtc,
      approvalRef: options.input.approvalRef,
      reason:
        options.input.reason ??
        options.output?.summary ??
        `Transition ${options.input.task.workflowState} -> ${options.input.to}`,
      artifactRefs: options.artifactRefs,
      configVersion: this.snapshot.version,
      configChecksum: this.snapshot.checksum
    };

    const transitionRecord: TransitionRecord = {
      ...baseRecord,
      transitionChecksum: createChecksum(baseRecord)
    };

    await this.validateSchema(SCHEMA_IDS.transitionRecord, transitionRecord, "transition record");
    return transitionRecord;
  }

  private async appendTransitionLog(record: TransitionRecord): Promise<void> {
    if (!this.transitionLogPath) {
      return;
    }

    await mkdir(dirname(this.transitionLogPath), { recursive: true });
    await appendFile(this.transitionLogPath, `${JSON.stringify(record)}\n`, "utf8");
  }

  private async validateSchema(schemaId: string, value: unknown, context: string): Promise<void> {
    const validator = getSchemaValidator();
    await validator.validateOrThrow(schemaId, value, context);
  }
}

function assertRuntimeSnapshot(snapshot: RuntimeConfigSnapshot, sourcePath: string): void {
  if (!snapshot || typeof snapshot !== "object") {
    throw new OrchestratorConfigError(`Invalid snapshot format in ${sourcePath}`);
  }

  if (!snapshot.version || !snapshot.environment || !snapshot.checksum) {
    throw new OrchestratorConfigError(`Snapshot metadata is incomplete in ${sourcePath}`);
  }

  if (!snapshot.workflow || snapshot.workflow.states.length === 0) {
    throw new OrchestratorConfigError(`Snapshot workflow is missing or empty in ${sourcePath}`);
  }

  if (!snapshot.agents || snapshot.agents.length === 0) {
    throw new OrchestratorConfigError(`Snapshot agents are missing in ${sourcePath}`);
  }
}
