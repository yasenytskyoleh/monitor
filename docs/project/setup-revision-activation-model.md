# Setup Revision Activation Model

## Purpose
Define the first explicit path for promoting an accepted setup-definition revision to operational current status.

This slice introduces activation contracts and audit records only.
It does not auto-activate revisions when they are created.

## Activation command contract
Contract:
- `ActivateSetupDefinitionRevisionCommand`
- `packages/domain-model/src/review/activate-setup-definition-revision-command.ts`

Fields:
- optional `setupDefinitionId`
- optional `setupFamilyId`
- `targetRevisionId`
- `activatedBy`
- `activatedAt`
- optional `rationale`
- optional `previousActiveRevisionId`
- optional `originRunId`

## Activation audit artifact contract
Contract:
- `SetupRevisionActivationRecord`
- `packages/domain-model/src/review/setup-revision-activation-record.ts`

Fields:
- activation id
- setup family id
- target revision/setup ids
- optional previous revision/setup ids
- actor/timestamp
- activation outcome
- optional rationale
- created/updated timestamps

## Activation result contract
Contract:
- `SetupRevisionActivationResult`
- `packages/domain-model/src/review/setup-revision-activation-result.ts`

Statuses:
- `activated`
- `superseded_previous`
- `already_active`
- `rejected`
- `failed`

## Activation eligibility rules
- only one active revision per setup family
- only `accepted` revisions are eligible
- activation target must match family/setup selectors
- activation is explicit and deterministic
