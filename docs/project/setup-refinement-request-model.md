# Setup Refinement Request Model

## Purpose
Define the first contract for turning an approved `refine_definition` decision into a structured, auditable follow-up request.

This slice creates request artifacts only. It does not edit setup-definition content.

## Refinement follow-up input contract
Contract:
- `CreateSetupRefinementRequestCommand`
- `packages/domain-model/src/review/create-setup-refinement-request-command.ts`

Fields:
- `researchDecisionApprovalId`
- `researchFeedbackDecisionId`
- `setupDefinitionId`
- `approvedAction` (must be `refine_definition`)
- `requestedBy`
- `requestedAt`
- `refinementRationaleSummary`
- `requestedChangesSummary`
- optional `evidenceReferences`
- optional `originRunId`

## Refinement request artifact contract
Contract:
- `SetupRefinementRequest`
- `packages/domain-model/src/review/setup-refinement-request.ts`

Fields:
- refinement request id
- setup definition id
- source approval id
- source feedback decision id
- refinement rationale summary
- requested changes summary
- optional evidence references
- status (`proposed` | `accepted` | `in_progress` | `completed` | `rejected`)
- requested by / requested at
- optional reviewer/owner placeholders
- created/updated timestamps

## Refinement request result contract
Contract:
- `SetupRefinementRequestResult`
- `packages/domain-model/src/review/setup-refinement-request-result.ts`

Statuses:
- `created`
- `rejected_validation`
- `rejected_lifecycle`
- `failed`

## Separation from lifecycle mutation
Lifecycle mutation path:
- updates setup status only
- does not create refinement work artifacts

Refinement follow-up path:
- creates a structured request/task only
- does not apply setup content edits in this slice
