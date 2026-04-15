# Setup Definition Revision Model

## Purpose
Define the first explicit path for turning a `SetupRefinementRequest` into a versioned `SetupDefinition` revision.

This slice creates a new setup-definition record and revision metadata. It does not auto-activate the revision.

## Revision command contract
Contract:
- `CreateSetupDefinitionRevisionCommand`
- `packages/domain-model/src/review/create-setup-definition-revision-command.ts`

Fields:
- `setupRefinementRequestId`
- `setupDefinitionId`
- `requestedBy`
- `requestedAt`
- `revisionSummary`
- `proposedChangedFieldsSummary`
- optional proposed revisionable fields:
  - `proposedDescription`
  - `proposedMeasurableConditions`
  - `proposedEvaluationAssumptions`
  - `proposedInvalidationAssumptions`
- optional `expectedPreviousRevisionId`
- optional `notes`
- optional `originRunId`

## Revision artifact contract
Contract:
- `SetupDefinitionRevision`
- `packages/domain-model/src/review/setup-definition-revision.ts`

Fields:
- revision id
- new setup definition id
- optional previous setup definition id
- `versionInfo` (`setupFamilyId`, `revisionId`, `version`, optional `previousRevisionId`)
- revision reason/status
- changed fields summary
- actor and timestamps
- source refinement request and lineage references

## Revision result contract
Contract:
- `SetupDefinitionRevisionResult`
- `packages/domain-model/src/review/setup-definition-revision-result.ts`

Statuses:
- `created`
- `rejected_validation`
- `rejected_linkage`
- `failed`

## First revisionable fields
Allowed revision content changes in this slice:
- measurable conditions
- evaluation assumptions
- invalidation assumptions
- description

Not included in this slice:
- automatic lifecycle activation
- setup-diff/migration engine
- cross-entity relinking automation
