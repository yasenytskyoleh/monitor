# ADR-015: Setup Refinement Follow-Up Path from Approved Decisions

## Status
Accepted

## Context
After ADR-014, Monitor can apply approved lifecycle mutations (`keep_active`, `pause_setup`, `archive_setup`) to `SetupDefinition` status.

The next missing boundary is the non-lifecycle path for `refine_definition` approvals. That outcome should not mutate setup content directly in the first version.

## Decision
Introduce a refinement follow-up handoff contract that converts an approved `refine_definition` action into a persisted refinement request:
- input: `CreateSetupRefinementRequestCommand`
- output: `SetupRefinementRequestResult`
- follow-up artifact: `SetupRefinementRequest`
- coordinator: `createApprovedRefinementFollowUpHandoff`
- service entrypoint: `ResearchService.createRefinementRequest(...)`

## Manual-first/non-automatic boundary
In this slice:
- refinement follow-up is request-driven
- no automatic setup-definition content mutation is allowed
- no hidden policy or LLM mutation is applied at this boundary
- refinement request creation is separate from setup lifecycle mutation

## Eligibility rules
A refinement request may be created only when:
- `ResearchDecisionApproval` exists
- `approvalOutcome` is `approved`
- `authorizedNextAction` is exactly `refine_definition`
- approval/setup/feedback linkage matches command payload

Otherwise, the request is rejected.

## Ownership boundary
Approval side owns:
- explicit authorization (`approved` + `authorizedNextAction=refine_definition`)

Research side owns:
- refinement rationale and evidence-linked recommendation context

Refinement side owns:
- creation of structured refinement follow-up request
- durable request tracking via status field

Setup-definition service does not auto-edit setup content from refinement request in this slice.

## Failure policy
- missing approval/setup -> `rejected_validation`
- non-approved approval outcome -> `rejected_lifecycle`
- wrong authorized action -> `rejected_lifecycle`
- linkage mismatch or invalid command -> `rejected_validation`
- unexpected persistence/runtime failure -> `failed` with retry warning

No queue/worker or auto-retry engine is introduced.

## Consequences
Positive:
- approved `refine_definition` outcomes now close into auditable follow-up artifacts
- lifecycle mutation and refinement request paths stay explicitly separated
- deterministic, fail-closed behavior remains intact

Trade-offs:
- refinement stays proposal-oriented, not execution-oriented
- no setup versioning/content patch flow in this version

## Explicitly postponed
- automatic setup-definition edits
- setup versioning/patch engine
- refinement reviewer UI or assignment queue
- batch refinement orchestration
- auto-closing refinement requests
