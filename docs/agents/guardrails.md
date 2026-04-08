# Agent Guardrails

## Purpose
Define runtime safety defaults, configuration controls, enforcement boundaries, and phase-specific limits for the agent system.

This document is the human-readable policy layer. Machine-readable validation must live in `packages/agent-config/schemas` and related runtime validation code.

---

## Core Safety Model
The system is **fail-closed by default**.

If the orchestrator cannot prove that an action is:
- valid,
- allowlisted,
- in the correct workflow state,
- within current phase scope,
- and supported by required artifacts,

then the action must be denied.

---

## Runtime Safety Defaults
- Fail startup if any config fails schema validation.
- Fail startup if any config fails semantic validation.
- Deny by default: agents may execute only explicitly allowlisted actions.
- Reject unresolved prompt references at startup.
- Reject undefined workflow states at startup.
- Reject duplicated workflow states at startup.
- Reject unreachable workflow states at startup.
- Reject duplicate agent identifiers.
- Reject unknown permission actions in allowlists.
- Reject startup if required schemas are missing.
- Reject startup if compiled config checksum does not match expected value.
- Reject runtime dispatch if agent role is not valid for current workflow state.
- Reject runtime dispatch if task envelope is missing required fields.
- Reject workflow advancement if required artifacts are missing.
- Reject publication if approval-gated transitions are incomplete.

---

## Configuration Source of Truth

### Human Source
Versioned YAML files under:

```text
configs/agents
```

These files define:
- roles,
- actions,
- workflow transitions,
- approvals,
- prompt references,
- environment overlays,
- allowlists,
- runtime limits.

### Machine Source
JSON Schemas under:

```text
packages/agent-config/schemas
```

These schemas validate:
- config structure,
- enums,
- action definitions,
- workflow contracts,
- approval contracts,
- task envelopes,
- agent output envelopes,
- escalation envelopes.

### Runtime Source
Compiled immutable config snapshot with checksum.

Runtime must execute only from the compiled snapshot, not from raw partially merged YAML files.

---

## Configuration Integrity Rules
- Raw config files must be parsed before merge.
- Merged config must be schema-validated before publish.
- Merged config must be semantically validated before publish.
- Published config must be immutable by version.
- Runtime must expose active config version and checksum.
- Runtime must reject partial or uncompiled config.
- Runtime must reject config with unknown keys where strict schema mode is enabled.
- Runtime must reject config that references missing prompts, states, roles, or actions.
- Runtime must reject transitions that do not map to known states.

---

## Checksum Integrity Policy

Two checksum classes are required:
- `configChecksum`: identifies the exact compiled config snapshot used by runtime.
- `transitionChecksum`: identifies an individual transition payload for audit integrity.

Expected `configChecksum` source:
- active version record in `configs/agents/versions/manifest.yaml` for the current environment.

Validation rules:
- startup must verify loaded compiled snapshot checksum against active manifest record,
- runtime transition logs must include both `configChecksum` and `transitionChecksum`,
- any checksum mismatch must block execution until corrected.

---

## Change Controls
- Config merge precedence is fixed: `base < env overlay < env vars`.
- Config publishing is immutable by version.
- Activation is environment-specific and explicit.
- Rollback must activate a previously published version for that environment.
- Runtime must log active config version and checksum at startup.
- Schema-breaking config changes require explicit version bump.
- Prompt changes that can affect runtime behavior must be versioned.
- Contract changes that affect downstream agents must be versioned.
- Approval policy changes must be versioned and traceable.
- No environment may auto-activate unpublished config.

---

## Enforcement Boundaries

### Action Enforcement
- Permission enforcement is checked before every agent action.
- No agent may invoke an action outside its allowlist.
- No agent may execute destructive or mutating actions unless explicitly allowed.
- No agent may mutate source-of-truth artifacts unless that action is explicitly allowlisted.
- Denied actions must be logged with reason.

### Workflow Enforcement
- Workflow enforcement is checked before every transition.
- Approval-required edges cannot be bypassed.
- Unknown transitions are hard failures.
- Terminal states cannot transition further.
- State ownership must be validated before dispatch.
- Recovery-mode behavior must be explicitly configured, never assumed.

### Approval Enforcement
- Approval-required transitions must include valid approval references.
- Approval references must match the required approval type.
- Expired approvals must be rejected.
- Mismatched approvals must be rejected.
- Missing approvals must block transition.
- Approval checks must happen before side effects.

### Artifact Enforcement
- Required artifact existence checks must run before state advancement.
- Referenced artifacts must be versioned or immutable.
- Artifact references must remain traceable across handoffs.
- Missing required artifacts must block progression.
- Replaced artifacts must preserve linkage to the earlier version.
- Orchestrator must reject transitions that drop required artifact references.

---

## Role-to-State Safety
- Each workflow state must have explicit role ownership.
- No role may execute outside its allowed state ownership unless fallback/recovery mode is explicitly configured.
- Shared ownership must be explicit, never implied.
- If ownership is ambiguous, dispatch must fail.
- If a task enters a state with no valid owner, the workflow must block and escalate.

---

## Prompt and Contract Safety
- Prompts must be versioned.
- Prompt identifiers referenced by runtime config must exist at startup.
- Contract schema versions must be compatible with the active orchestrator version.
- Runtime must fail closed on contract mismatch.
- Prompts must not be resolved dynamically from untrusted sources at execution time.
- Contract references used by agents must be stable and auditable.
- Runtime must reject contract references that point to unpublished or unknown versions.

---

## Escalation Safety Rules
Escalations must be structured.

An escalation payload must include:
- `taskId`
- `agentRole`
- `workflowState`
- `severity`
- `reason`
- `riskNotes`
- `requestedDecision`

Optional fields:
- `blockingArtifacts`
- `recommendedNextAction`
- `relatedApprovalType`
- `relatedContractRefs`

### Standard Severity Values
- `low`
- `medium`
- `high`
- `critical`

### Escalation Rules
- Critical escalations must block further execution until resolved.
- High-severity escalations should block side effects unless explicitly overridden by policy.
- Escalations must be persisted in audit history.
- Free-form escalation text alone is insufficient.
- Escalations that affect architecture, approval policy, or phase scope must be reviewable by humans.

---

## Audit and Traceability Guardrails
The system must preserve enough evidence to explain:
- why an agent acted,
- why a transition happened,
- why a transition was denied,
- what config version was active,
- what artifacts were used,
- what approvals were applied.

### Minimum Audit Requirements
- log every workflow transition,
- log every denied action,
- log every approval decision,
- log every escalation event,
- log config version, checksum, and environment on startup,
- log artifact references involved in each transition,
- log final workflow outcome,
- preserve audit history for both completed and rejected workflows.

### Immutability Rules
- Completed workflow audit records must be append-only.
- Rejected workflow audit records must be append-only.
- Corrections must be stored as versioned annotations, not destructive edits.
- Approval records must remain traceable even after rollback of config versions.

---

## Artifact Safety Rules
- Every produced artifact must be addressable by stable reference.
- Every artifact referenced in workflow transitions must be immutable or versioned.
- Every required artifact type must be identifiable by contract.
- Artifacts used for approvals must remain available for later audit.
- Source-of-truth artifacts must not be overwritten without versioning.
- Machine-readable contract artifacts must remain synchronized with human-readable docs.
- Missing artifact traceability must block promotion to later workflow states.

---

## Phase 1 Scope Guardrails

### Allowed in Phase 1
- spot market data ingestion
- rule-based signal definition
- signal statistics and evaluation
- docs/contracts/orchestrator foundation
- approval-gated signal publication
- deterministic pattern formalization
- manual review of signals and artifacts

### Not Allowed in Phase 1
- automated trading execution
- futures logic
- leverage logic
- funding-rate logic
- liquidation logic
- news enrichment
- sentiment scoring
- discretionary signal generation without measurable rules
- hidden environment-dependent behavior outside config
- dynamic undeclared side effects
- unapproved external integrations that affect signal publication behavior

### Phase 1 Rejection Rule
If a task requires out-of-scope Phase 1 behavior, it must be:
- rejected,
- or explicitly deferred,
- or split into an in-scope subset plus a deferred item.

---

## Non-Goals (Phase 1)
These are explicitly not goals for the current phase:
- building an autonomous trading bot,
- executing spot orders automatically,
- supporting futures exchanges or derivatives-specific analytics,
- using AI for discretionary signal generation,
- adding news-based scoring before signal/statistics foundation is stable,
- allowing undocumented runtime behavior.

---

## Failure Policy
If the system cannot prove an action is allowed, valid, and in scope, it must deny execution.

This policy is fail-closed by default.

### Denial Conditions
Execution must be denied when:
- config is invalid,
- role is unknown,
- workflow state is invalid,
- transition is not allowlisted,
- approval is missing, mismatched, expired, or revoked,
- required artifacts are missing,
- contract versions are incompatible,
- phase scope is violated,
- action allowlist does not include the requested operation.

### Denial Outcome Requirements
A denial should produce:
- machine-readable rejection code,
- human-readable reason,
- blocking references if available,
- recommended next step.

---

## Startup Validation Checklist
At startup, the system should validate at minimum:
- config schema validity,
- semantic config validity,
- known roles,
- known workflow states,
- reachable workflow graph,
- valid approval edges,
- known prompts,
- known contract references,
- checksum integrity against active manifest record,
- environment activation state.

If any required startup validation fails, startup must fail.

---

## Runtime Validation Checklist
Before dispatching an agent action, the system should validate at minimum:
- task envelope structure,
- active workflow state,
- allowed role ownership,
- action allowlist,
- required artifact presence,
- approval state if needed,
- active config version and checksum integrity.

If any required runtime validation fails, execution must be denied.

---

## Implementation Guidance
This document should be enforced by:
- config schema validation,
- semantic validation pass,
- orchestrator runtime guards,
- approval middleware,
- artifact resolver checks,
- audit logging middleware.

Human-readable docs alone are not sufficient enforcement.
