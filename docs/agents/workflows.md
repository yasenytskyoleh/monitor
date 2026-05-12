# Agent Workflow Contract

## Purpose
Define the allowed workflow state machine, handoff rules, approval gates, and audit requirements for the agent system.

This document describes the **internal orchestration subsystem**.
In current repo usage, day-to-day planning and implementation run through a **Codex-first workflow**. Codex may use these workflow contracts without requiring separate human-operated agents or separate user identities.

## Workflow Model
Workflow states are defined in configuration and enforced at runtime. Human-readable semantics are defined here; machine validation lives in `packages/agent-config/schemas`.

## State Machine

### Standard Workflow States
1. `INTAKE`
2. `DESIGN`
3. `FORMALIZE`
4. `IMPLEMENT`
5. `REVIEW`
6. `APPROVAL`
7. `PUBLISH_SIGNAL`
8. `DONE`
9. `REJECTED`

## State Intent

### `INTAKE`
Initial problem framing and task creation.

### `DESIGN`
Architecture and system boundary definition.

### `FORMALIZE`
Pattern/rule formalization and measurable evaluation planning.

### `IMPLEMENT`
Approved code and contract implementation.

### `REVIEW`
Documentation, consistency, and validation review.

### `APPROVAL`
Human or policy-based approval gate for sensitive transitions.

### `PUBLISH_SIGNAL`
Signal publication or release of a signal definition to the enabled environment.

### `DONE`
Workflow completed successfully.

### `REJECTED`
Workflow terminated intentionally due to policy, approval failure, invalid state, or unsupported request.

---

## Allowed High-Level Flow

```text
INTAKE -> DESIGN -> FORMALIZE -> IMPLEMENT -> REVIEW -> APPROVAL -> PUBLISH_SIGNAL -> DONE
```

Any state may transition to `REJECTED` only where explicitly allowed by config and policy.

## Allowed Role Ownership by State
- `INTAKE` -> Product Agent
- `DESIGN` -> Architect Agent
- `FORMALIZE` -> Quant Pattern Agent
- `IMPLEMENT` -> Backend Agent
- `REVIEW` -> Docs Reviewer Agent
- `APPROVAL` -> Human reviewer or explicit approval service
- `PUBLISH_SIGNAL` -> controlled system action only
- `DONE` -> terminal
- `REJECTED` -> terminal

No agent may operate outside its allowed state ownership unless explicitly configured for fallback or recovery mode.

---

## Fallback and Recovery Mode

Fallback/recovery mode is disabled by default.

It may be enabled only when all of the following are true:
- transition is explicitly allowlisted in environment-specific workflow config,
- reason is recorded in transition metadata,
- required artifacts from the previous state are preserved,
- approval requirements for the target edge are still enforced.

Fallback/recovery mode must never bypass:
- approval-gated transitions,
- terminal state rules,
- phase-scope guardrails.

---

## Mandatory Approval Gates

### Architecture Gate
Transition `DESIGN -> FORMALIZE` requires explicit approval of type `ARCHITECTURE`.

Purpose:
- confirm architecture boundaries
- confirm module ownership
- confirm no unapproved scope expansion

### Signal Publish Gate
Transition `APPROVAL -> PUBLISH_SIGNAL` requires explicit approval of type `SIGNAL_PUBLISH`.

Purpose:
- confirm signal definition is approved
- confirm required implementation and review artifacts exist
- confirm environment activation is permitted

If approval is missing, invalid, expired, or mismatched, the orchestrator must block the transition and emit a structured rejection reason.

---

## Approval Reference Contract

Every approval reference used by a transition must include:
- `approvalId`
- `approvalType`
- `approvedBy`
- `approvedAtUtc`
- `status`

Optional fields:
- `expiresAtUtc`
- `revokedAtUtc`
- `revokedBy`

Approval validity rules:
- `approvalType` must match the transition-required approval type,
- `status` must be `approved`,
- if `expiresAtUtc` exists, current time must be earlier than expiry,
- if `revokedAtUtc` exists, approval is invalid.

---

## Handoff Rules

- Handoffs are valid only when explicitly listed in `workflow.transitions` config.
- Unknown transitions are hard failures.
- Repeated transitions may be blocked or rate-limited by policy.
- A handoff must preserve artifact references required by the next state.
- A handoff must not discard unresolved risk notes.

### Transition Metadata Requirements
Every transition record must capture:
- `taskId`
- `from`
- `to`
- `requestedBy`
- `executedBy`
- `timestampUtc`
- `approvalRef` (if required)
- `reason`
- `artifactRefs`
- `configVersion`
- `configChecksum`
- `transitionChecksum`

### Transition Checksum Policy
- `configChecksum` is the checksum of the active compiled config snapshot used for this transition.
- `transitionChecksum` is the checksum of transition metadata payload (`taskId`, `from`, `to`, `requestedBy`, `executedBy`, `timestampUtc`, `approvalRef`, `reason`, `artifactRefs`, `configVersion`, `configChecksum`).

---

## Rejection Rules

A workflow may move to `REJECTED` when:
- required approval is missing
- state transition is not allowlisted
- required artifacts are missing
- config validation fails
- task violates phase scope
- task becomes invalid due to contradictory contracts
- human reviewer explicitly rejects it

### Rejection Output Requirements
A rejection event must include:
- `taskId`
- `state`
- `rejectionCode`
- `reason`
- `blockingArtifacts`
- `recommendedNextAction`

---

## Audit Requirements

Each workflow run must store:
- state transition history
- agent input envelope hash
- agent output envelope hash
- approval events
- artifact references
- final outcome (`DONE` or `REJECTED`)
- config version used
- workflow checksum or equivalent snapshot identifier

Audit data must be immutable after workflow completion, except for explicitly versioned append-only annotations.

---

## Invariants

- Terminal states are `DONE` and `REJECTED`.
- Terminal states cannot transition further.
- Approval-required edges cannot be bypassed.
- Orchestrator must validate state ownership before dispatch.
- Orchestrator must validate config version before executing a transition.
- Signal publication is impossible without both successful review and explicit publish approval.

---

## Phase 1 Scope Constraints
In Phase 1:
- only spot-market workflows are valid
- automated trade execution is out of scope
- news enrichment is out of scope
- futures, leverage, funding-rate, and liquidation logic are out of scope

Any workflow requiring these concerns must be rejected or deferred explicitly.

---

## Minimal Expected Flow Example

```text
Task created
-> INTAKE by Product Agent
-> DESIGN by Architect Agent
-> ARCHITECTURE approval granted
-> FORMALIZE by Quant Pattern Agent
-> IMPLEMENT by Backend Agent
-> REVIEW by Docs Reviewer Agent
-> APPROVAL
-> SIGNAL_PUBLISH approval granted
-> PUBLISH_SIGNAL
-> DONE
```
