# Research Decision Approval Model

## Purpose
Define the first explicit manual approval contract for `ResearchFeedbackDecision` recommendations.

This slice introduces approval artifacts and approval outcomes only.
It does not perform automatic setup lifecycle mutation.

## Approval input contract
Contract:
- `ReviewResearchDecisionCommand`
- `packages/domain-model/src/review/review-research-decision-command.ts`

Fields:
- `researchFeedbackDecisionId`
- `setupDefinitionId`
- `reviewedBy`
- `reviewedAt`
- `decisionOutcome` (`approved` | `rejected` | `needs_changes`)
- optional `reviewerNotes`
- optional `originRunId`

## Approval artifact contract
Contract:
- `ResearchDecisionApproval`
- `packages/domain-model/src/review/research-decision-approval.ts`

Fields:
- approval id
- feedback decision id
- setup definition id
- reviewer identity/timestamp
- approval outcome
- optional reviewer notes
- approval status (`recorded`)
- optional `authorizedNextAction`
- created/updated timestamps

## Approval result contract
Contract:
- `ResearchDecisionApprovalResult`
- `packages/domain-model/src/review/research-decision-approval-result.ts`

Statuses:
- `recorded`
- `rejected_validation`
- `rejected_lifecycle`
- `failed`

## First approval semantics
- approval is allowed only when feedback decision is in `proposed` status
- outcome mapping:
  - `approved` -> feedback decision becomes `accepted`
  - `rejected` -> feedback decision becomes `rejected`
  - `needs_changes` -> feedback decision becomes `reviewed`
- `authorizedNextAction` is present only for `approved` outcomes

## Manual-vs-automated boundary
- manual approval is mandatory in this slice
- recommendation does not imply automatic execution
- no auto-approval policy engine exists
- no automatic setup lifecycle mutation is performed here
