# ADR-013: Manual Approval for Research Feedback Decisions

## Status
Accepted

## Context
After ADR-012, Monitor can produce persisted `ResearchFeedbackDecision` recommendations from hypothesis evidence.

The next missing boundary is how those recommendations are explicitly approved or rejected before any setup lifecycle mutation is authorized.

Without this boundary, the loop still stops at recommendation and cannot safely authorize downstream setup actions.

## Decision
Introduce a manual approval handoff contract for feedback decisions:
- input: `ReviewResearchDecisionCommand`
- output: `ResearchDecisionApprovalResult`
- approval artifact: `ResearchDecisionApproval`
- coordinator: `createResearchDecisionApprovalHandoff`
- service entrypoint: `ResearchService.approveFeedbackDecision(...)`

## Approval outcomes (first version)
Use explicit manual outcomes:
- `approved`
- `rejected`
- `needs_changes`

Outcome mapping to feedback-decision status:
- `approved` -> feedback decision `accepted`
- `rejected` -> feedback decision `rejected`
- `needs_changes` -> feedback decision `reviewed`

## Manual-first boundary
Approval is explicit and separate from recommendation generation.

In this ADR:
- recommendation alone cannot mutate setup lifecycle
- no auto-approval exists
- approval records are persisted as explicit review artifacts
- approved outcomes only authorize a future action; they do not execute all lifecycle mutation automatically

## Ownership boundary
Research recommendation side owns:
- recommendation generation
- evidence linkage and rationale
- proposed action

Approval side owns:
- reviewer identity and notes
- approval outcome
- authorization signal for allowed next action

Setup-definition service side owns:
- actual setup lifecycle mutation behavior and transition validation

## Failure policy
- missing feedback decision/setup definition/reviewer -> `rejected_validation`
- non-`proposed` feedback decision status -> `rejected_lifecycle`
- invalid approval outcome -> `rejected_validation`
- unexpected persistence/runtime failure -> `failed` with retry warning

No queue/worker or role system is introduced in this slice.

## Consequences
Positive:
- first auditable manual-approval boundary exists
- recommendation and approval remain explicitly separate
- fail-closed behavior is preserved for setup mutation authorization

Trade-offs:
- approval workflow remains intentionally narrow
- no reviewer UI or permissions model yet

## Explicitly postponed
- automatic setup lifecycle mutation
- reviewer dashboard and notification flow
- role/permission redesign
- approval queues/workers
- full product governance workflow engine
