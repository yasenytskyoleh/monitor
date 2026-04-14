# Setup Lifecycle Mutation Model

## Purpose
Define the first explicit contract for applying approved setup lifecycle changes.

This slice introduces lifecycle mutation contracts and audit artifacts.
It does not mutate setup-definition content.

## Mutation input contract
Contract:
- `ApplyApprovedSetupMutationCommand`
- `packages/domain-model/src/review/apply-approved-setup-mutation-command.ts`

Fields:
- `researchDecisionApprovalId`
- `researchFeedbackDecisionId`
- `setupDefinitionId`
- `approvedAction` (`keep_active` | `pause_setup` | `archive_setup`)
- `mutatedBy`
- `mutatedAt`
- optional `notes`
- optional `originRunId`

## Mutation audit artifact contract
Contract:
- `SetupLifecycleMutationRecord`
- `packages/domain-model/src/review/setup-lifecycle-mutation-record.ts`

Fields:
- mutation id
- setup definition id
- approval id
- feedback decision id
- previous/new setup status
- approved action
- mutation actor/timestamp
- optional notes
- created/updated timestamps

## Mutation result contract
Contract:
- `SetupLifecycleMutationResult`
- `packages/domain-model/src/review/setup-lifecycle-mutation-result.ts`

Statuses:
- `applied`
- `rejected_validation`
- `rejected_lifecycle`
- `failed`

## First legal transition policy
Allowed actions:
- `keep_active`
- `pause_setup`
- `archive_setup`

Allowed status transitions:
- `draft` -> `active`
- `active` -> `paused`
- `active` -> `archived`
- `paused` -> `active`
- `paused` -> `archived`

All other transitions are rejected.

## Deterministic/manual-gated rules
- only `approved` decisions can authorize mutation
- approval and setup linkage must match exactly
- mutation command action must match approval `authorizedNextAction`
- no LLM/freeform reasoning at this boundary
- no automatic mutation without explicit approval artifact

## Ownership boundary
Approval side owns:
- approval outcome
- authorized next action

Setup-definition service owns:
- transition legality
- setup lifecycle update execution
- mutation audit record persistence
