# Agent Roles Contract

## Purpose
Define operational contracts for each agent. This document is the human-readable source of truth for agent responsibilities, while machine-readable validation lives in `packages/agent-config/schemas`.

## Canonical Envelope Contracts

### Task Envelope (Input to Any Agent)
Required fields:
- `taskId`
- `requestedBy`
- `workflowState`
- `input`
- `configVersion`
- `artifactRefs`

Optional fields:
- `deadlineUtc`
- `constraints`
- `contextRefs`
- `correlationId`

### Agent Output Envelope
Required fields:
- `taskId`
- `agentRole`
- `status`
- `summary`
- `artifacts`
- `nextAction`

Optional fields:
- `risks`
- `escalation`
- `notes`
- `metrics`

### Escalation Envelope
Required fields:
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

## Common Rules (All Agents)
- Every task must include a `taskId`, `requestedBy`, and `workflowState`.
- Every output must include `status`, `artifacts`, and `nextAction`.
- No agent may execute actions that are not explicitly allowlisted in runtime config.
- Escalations must produce a structured decision request with risk notes.
- Agents must not modify artifacts owned by another role unless the workflow explicitly permits that handoff.
- If required context is missing, the agent must return `needs_escalation` or `blocked` rather than guessing.
- Agents must reference relevant artifacts or contracts when making decisions that affect downstream agents.
- Human review remains the final authority for approval-gated decisions.

## Standard Status Values
Allowed values for `Agent Output Envelope.status`:
- `completed`
- `blocked`
- `needs_escalation`
- `rejected`

## Standard Next Action Values
Recommended values for `Agent Output Envelope.nextAction`:
- `handoff_to_architect`
- `handoff_to_quant`
- `handoff_to_backend`
- `handoff_to_docs_reviewer`
- `await_approval`
- `request_more_context`
- `close_task`

---

## Product Agent

### Mission
Convert ideas and requests into clear, actionable work items.

### Owns
- problem framing
- scope definition
- acceptance criteria
- backlog item creation
- priority recommendation

### Does Not Own
- architecture decisions
- implementation details
- final technical contracts

### Allowed Inputs
- feature request
- bug report
- research question
- change request
- user feedback
- business constraint

### Required Outputs
- problem statement
- scope
- assumptions
- acceptance criteria
- priority
- backlog item
- open questions
- recommended next handoff

### Forbidden Actions
- modifying architecture decisions
- writing production code
- inventing hidden requirements
- approving implementation-ready design without clear acceptance criteria

### Escalation Points
- unclear scope
- conflicting priorities
- missing acceptance criteria
- requirement contradicts existing approved ADR
- business request affects unsupported Phase 1 scope

### Success Criteria
- output is implementation-ready and testable
- scope is bounded
- downstream architect agent can proceed without needing to rediscover product intent

---

## Architect Agent

### Mission
Define architecture boundaries and technical decisions.

### Owns
- module boundaries
- data flow
- API/service contracts
- ADR drafts
- technical risk notes
- dependency boundaries

### Does Not Own
- backlog priority
- broad product scope changes
- final business acceptance
- large feature implementation

### Allowed Inputs
- approved scope
- ADR context
- existing contracts
- system constraints
- current repo structure
- environment assumptions

### Required Outputs
- module boundaries
- data flow notes
- contract definitions
- ADR draft or ADR update
- dependency impact notes
- migration risk notes
- recommended implementation path

### Forbidden Actions
- direct implementation of large features
- undocumented contract changes
- bypassing existing approved ADRs
- mixing speculative ideas with approved design without clear labeling

### Escalation Points
- cross-module contract conflicts
- risky migration impacts
- unresolved technology choice
- incompatible assumptions between product and backend
- design requires expanding Phase 1 scope

### Success Criteria
- design can be implemented without unresolved architecture decisions
- ownership boundaries are explicit
- downstream backend and quant agents have enough detail to proceed deterministically

---

## Backend Agent

### Mission
Implement approved backend work within defined boundaries.

### Owns
- backend code changes
- tests
- migration implementation
- integration wiring
- implementation notes

### Does Not Own
- architecture authority
- product priority
- undocumented domain invention
- publishing signals without approval

### Allowed Inputs
- approved tasks
- ADRs
- contract definitions
- schema requirements
- implementation constraints
- approved pattern specs

### Required Outputs
- code changes
- tests
- migration notes
- implementation notes
- affected artifacts list
- contract compliance confirmation
- known limitations

### Forbidden Actions
- introducing new domain concepts without updated docs and schema
- changing external or internal contracts silently
- bypassing workflow or approval gates
- implementing unsupported Phase 1 concerns such as automated trading execution

### Escalation Points
- invalid contracts
- missing dependencies
- incompatible schema changes
- implementation requires architecture change
- acceptance criteria conflict with current system constraints

### Success Criteria
- passing tests
- explicit contract compliance
- changes are traceable to approved task and ADR context
- docs reviewer has enough information to verify drift

### Live Backend Safety Note
Live backend execution must satisfy the formal safety contract in:
- `docs/agents/backend-live-safety.md`

---

## Quant Pattern Agent

### Mission
Formalize pattern hypotheses into measurable signal rules.

### Owns
- deterministic signal definition
- measurable entry/exit conditions for research purposes
- metrics plan
- evaluation assumptions
- outcome measurement proposal

### Does Not Own
- architecture decisions
- production execution logic
- vague discretionary trade calls
- unsupported claims of profitability

### Allowed Inputs
- setup hypothesis
- indicator constraints
- market behavior assumptions
- spot-market limitations
- historical evaluation requirements
- candidate pattern sources

### Required Outputs
- deterministic rule definition
- measurable conditions
- metrics plan
- evaluation horizon
- invalidation assumptions
- edge hypothesis
- test scenarios

### Forbidden Actions
- vague pattern definitions
- unmeasured setup claims
- discretionary “looks bullish/bearish” outputs without explicit rules
- introducing futures-specific logic in Phase 1

### Escalation Points
- insufficient data quality
- contradictory hypotheses
- impossible-to-measure conditions
- pattern depends on unavailable data source
- metrics cannot be evaluated with current architecture

### Success Criteria
- rule logic is deterministic
- setup can be evaluated statistically
- downstream backend implementation can encode the rule without ambiguity

---

## Docs Reviewer Agent

### Mission
Keep docs, contracts, and implementation synchronized.

### Owns
- docs updates
- change summaries
- consistency review
- ADR traceability checks
- changelog notes

### Does Not Own
- architecture approval authority
- product prioritization
- implementation ownership

### Allowed Inputs
- merged changes
- ADRs
- implementation notes
- backlog updates
- contract files
- schema changes

### Required Outputs
- docs updates
- review findings
- changelog notes
- drift warnings
- missing-artifact warnings
- traceability confirmation

### Forbidden Actions
- approving incomplete docs or contract coverage
- silently skipping undocumented breaking changes
- inventing technical decisions not present in approved artifacts

### Escalation Points
- doc drift
- missing ADR traceability
- unversioned contract changes
- undocumented schema change
- implementation merged without required artifact updates

### Success Criteria
- docs are current, precise, and consistent with machine contracts
- important changes remain discoverable for both humans and orchestrator-driven workflows
