import assert from "node:assert/strict";
import test from "node:test";

import { ConfigValidationError } from "../src/errors.js";
import { getSchemaValidator } from "../src/schema-validator.js";

const SCHEMA_IDS = {
  runtimeDefaults: "https://monitor/schemas/runtime-defaults.schema.json",
  permissionAllowlist: "https://monitor/schemas/permission-allowlist.schema.json",
  promptReference: "https://monitor/schemas/prompt-reference.schema.json",
  agentConfig: "https://monitor/schemas/agent-config.schema.json",
  workflowGraph: "https://monitor/schemas/workflow-graph.schema.json",
  envOverlay: "https://monitor/schemas/env-overlay.schema.json",
  configVersionRecord: "https://monitor/schemas/config-version-record.schema.json",
  taskEnvelope: "https://monitor/schemas/task-envelope.schema.json",
  escalationEnvelope: "https://monitor/schemas/escalation-envelope.schema.json",
  agentOutputEnvelope: "https://monitor/schemas/agent-output-envelope.schema.json",
  approvalReference: "https://monitor/schemas/approval-reference.schema.json",
  transitionRecord: "https://monitor/schemas/transition-record.schema.json",
  rejectionEvent: "https://monitor/schemas/rejection-event.schema.json"
} as const;

test("validates runtime defaults schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.runtimeDefaults,
    {
      version: 1,
      schemaVersion: 1,
      runtime: {
        defaultProvider: "openai",
        defaultModel: "gpt-5.4-mini",
        temperature: 0.1,
        maxTokens: 1200,
        retryPolicy: {
          maxRetries: 2
        },
        timeoutMs: 30000
      }
    },
    "runtime defaults"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.runtimeDefaults,
      {
        version: 1,
        schemaVersion: 1,
        runtime: {
          defaultProvider: "openai",
          defaultModel: "",
          temperature: -1,
          maxTokens: 0,
          retryPolicy: {
            maxRetries: -1
          },
          timeoutMs: 100
        }
      },
      "invalid runtime defaults"
    ),
    ConfigValidationError
  );
});

test("validates permission allowlist schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.permissionAllowlist,
    {
      allowedActions: ["docs.read", "workflow.escalate"]
    },
    "permissions"
  );

  await assert.rejects(
    validator.validateOrThrow(SCHEMA_IDS.permissionAllowlist, { allowedActions: [] }, "invalid permissions"),
    ConfigValidationError
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.permissionAllowlist,
      {
        allowedActions: ["read_docs"]
      },
      "invalid permission naming"
    ),
    ConfigValidationError
  );
});

test("validates prompt reference schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.promptReference,
    {
      version: "v1",
      file: "product-agent.txt"
    },
    "prompt ref"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.promptReference,
      {
        version: "v1",
        file: "prompt.md"
      },
      "invalid prompt ref"
    ),
    ConfigValidationError
  );
});

test("validates agent config schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.agentConfig,
    {
      id: "product-agent",
      role: "PRODUCT",
      ownsStates: ["INTAKE"],
      allowedInputs: ["feature-request"],
      requiredOutputs: ["scope"],
      allowedNextActions: ["handoff_to_architect"],
      permissions: {
        allowedActions: ["docs.read"]
      },
      requiredArtifacts: ["product-brief"],
      outputContract: {
        schemaRef: "agent-output-envelope.v1"
      },
      escalation: {
        allowed: true,
        severities: ["low", "medium"]
      },
      prompt: {
        version: "v1",
        file: "product-agent.txt"
      }
    },
    "agent config"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.agentConfig,
      {
        id: "ProductAgent",
        role: "PRODUCT",
        ownsStates: ["INTAKE"],
        allowedInputs: ["feature-request"],
        requiredOutputs: ["scope"],
        allowedNextActions: ["handoff_to_architect"],
        permissions: {
          allowedActions: ["docs.read"]
        },
        requiredArtifacts: ["product-brief"],
        outputContract: {
          schemaRef: "agent-output-envelope.v1"
        },
        escalation: {
          allowed: true,
          severities: ["low"]
        },
        prompt: {
          version: "v1",
          file: "product-agent.txt"
        }
      },
      "invalid agent config"
    ),
    ConfigValidationError
  );
});

test("validates workflow graph schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.workflowGraph,
    {
      version: 1,
      schemaVersion: 1,
      workflow: {
        states: ["INTAKE", "DESIGN", "DONE"],
        initialState: "INTAKE",
        terminalStates: ["DONE"],
        stateOwners: {
          INTAKE: "PRODUCT",
          DESIGN: "ARCHITECT",
          DONE: "TERMINAL"
        },
        transitions: [
          {
            from: "INTAKE",
            to: "DESIGN"
          },
          {
            from: "DESIGN",
            to: "DONE"
          }
        ]
      }
    },
    "workflow"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.workflowGraph,
      {
        version: 1,
        schemaVersion: 1,
        workflow: {
          states: ["INTAKE", "DESIGN"],
          initialState: "INTAKE",
          terminalStates: ["DONE"],
          stateOwners: {
            INTAKE: "PRODUCT",
            DESIGN: "ARCHITECT"
          },
          transitions: [
            {
              from: "INTAKE",
              to: "DESIGN",
              requiresApproval: true
            }
          ]
        }
      },
      "invalid workflow"
    ),
    ConfigValidationError
  );
});

test("validates env overlay schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.envOverlay,
    {
      version: 1,
      schemaVersion: 1,
      environment: "dev",
      overrides: {
        runtime: {
          defaultModel: "gpt-5.4"
        },
        approvals: {
          allowMockApprovals: false
        }
      }
    },
    "env overlay"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.envOverlay,
      {
        version: 1,
        schemaVersion: 1,
        environment: "dev",
        overrides: {
          runtime: {
            defaultModel: ""
          }
        }
      },
      "invalid env overlay"
    ),
    ConfigValidationError
  );
});

test("validates config version record schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.configVersionRecord,
    {
      releaseId: "agents-v1-dev",
      environment: "dev",
      configVersion: "v1",
      promptSetVersion: "v1",
      schemaVersion: 1,
      createdBy: "tester",
      createdAt: "2026-04-08T12:00:00.000Z",
      checksum: "7e85eb7298fca09d44f2d4f373f2044e6f0527711e8d9709edff5a5ef55fdf4d",
      snapshotPath: "configs/agents/versions/snapshots/v1/dev.json"
    },
    "version record"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.configVersionRecord,
      {
        releaseId: "",
        environment: "dev",
        configVersion: "v1",
        promptSetVersion: "v1",
        schemaVersion: 0,
        checksum: "invalid",
        createdAt: "2026-04-08",
        createdBy: "",
        snapshotPath: ""
      },
      "invalid version record"
    ),
    ConfigValidationError
  );
});

test("validates task envelope schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.taskEnvelope,
    {
      taskId: "task-001",
      requestedBy: "user-1",
      workflowState: "INTAKE",
      input: {
        feature: "agent config"
      },
      configVersion: "v1",
      artifactRefs: ["docs/agents/roles.md"],
      correlationId: "corr-001"
    },
    "task envelope"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.taskEnvelope,
      {
        taskId: "task-001",
        requestedBy: "user-1",
        workflowState: "INTAKE",
        configVersion: "v1",
        artifactRefs: []
      },
      "invalid task envelope"
    ),
    ConfigValidationError
  );
});

test("validates escalation envelope schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.escalationEnvelope,
    {
      taskId: "task-001",
      agentRole: "BACKEND",
      workflowState: "IMPLEMENT",
      severity: "high",
      reason: "Missing architecture decision",
      riskNotes: ["Potential contract breakage"],
      requestedDecision: "Confirm API boundary"
    },
    "escalation envelope"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.escalationEnvelope,
      {
        taskId: "task-001",
        agentRole: "BACKEND",
        workflowState: "IMPLEMENT",
        severity: "urgent",
        reason: "Missing architecture decision",
        riskNotes: ["Potential contract breakage"],
        requestedDecision: "Confirm API boundary"
      },
      "invalid escalation envelope"
    ),
    ConfigValidationError
  );
});

test("validates agent output envelope schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.agentOutputEnvelope,
    {
      taskId: "task-001",
      agentRole: "PRODUCT",
      status: "completed",
      summary: "Backlog item prepared",
      artifacts: ["artifacts/task-001-product-output.json"],
      nextAction: "handoff_to_architect"
    },
    "agent output envelope"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.agentOutputEnvelope,
      {
        taskId: "task-001",
        agentRole: "PRODUCT",
        status: "needs_escalation",
        summary: "Need architecture decision",
        artifacts: ["artifacts/task-001-product-output.json"],
        nextAction: "await_approval"
      },
      "invalid agent output envelope"
    ),
    ConfigValidationError
  );
});

test("validates approval reference and transition schemas", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.approvalReference,
    {
      approvalId: "appr-001",
      approvalType: "ARCHITECTURE",
      approvedBy: "reviewer-1",
      approvedAtUtc: "2026-04-08T12:00:00.000Z",
      status: "approved"
    },
    "approval reference"
  );

  await validator.validateOrThrow(
    SCHEMA_IDS.transitionRecord,
    {
      taskId: "task-001",
      from: "DESIGN",
      to: "FORMALIZE",
      requestedBy: "architect-agent",
      executedBy: "orchestrator",
      timestampUtc: "2026-04-08T12:05:00.000Z",
      approvalRef: {
        approvalId: "appr-001",
        approvalType: "ARCHITECTURE",
        approvedBy: "reviewer-1",
        approvedAtUtc: "2026-04-08T12:00:00.000Z",
        status: "approved"
      },
      reason: "Approved design handoff",
      artifactRefs: ["docs/architecture/adr/ADR-001-system-positioning.md"],
      configVersion: "v1",
      configChecksum: "7e85eb7298fca09d44f2d4f373f2044e6f0527711e8d9709edff5a5ef55fdf4d",
      transitionChecksum: "2eb7577f0dc69e3a3658f66be5f4aa1e34f70a76e8bd7f3f12f3f6e0bf0d78f6"
    },
    "transition record"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.transitionRecord,
      {
        taskId: "task-001",
        from: "DESIGN",
        to: "FORMALIZE",
        requestedBy: "architect-agent",
        executedBy: "orchestrator",
        timestampUtc: "not-a-timestamp",
        reason: "Approved design handoff",
        artifactRefs: [],
        configVersion: "v1",
        configChecksum: "invalid",
        transitionChecksum: "invalid"
      },
      "invalid transition record"
    ),
    ConfigValidationError
  );
});

test("validates rejection event schema", async () => {
  const validator = getSchemaValidator();

  await validator.validateOrThrow(
    SCHEMA_IDS.rejectionEvent,
    {
      taskId: "task-002",
      state: "APPROVAL",
      rejectionCode: "MISSING_APPROVAL",
      reason: "Approval reference was not provided",
      blockingArtifacts: ["artifacts/task-002-approval-request.json"],
      recommendedNextAction: "request_more_context"
    },
    "rejection event"
  );

  await assert.rejects(
    validator.validateOrThrow(
      SCHEMA_IDS.rejectionEvent,
      {
        taskId: "task-002",
        state: "APPROVAL",
        rejectionCode: "missing-approval",
        reason: "Approval reference was not provided",
        blockingArtifacts: ["artifacts/task-002-approval-request.json"],
        recommendedNextAction: "request_more_context"
      },
      "invalid rejection event"
    ),
    ConfigValidationError
  );
});
