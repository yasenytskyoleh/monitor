# Setup Versioning Strategy

## First strategy
Use a setup-family revision chain:
- each setup lineage has a stable `setupFamilyId`
- each revision has a unique `revisionId`
- each revision increments integer `version`
- each revision points to `previousRevisionId` when present

## Old/new linkage
- previous setup definition remains immutable
- new revision creates a new draft `SetupDefinition`
- `SetupDefinitionRevision.previousSetupDefinitionId` links old->new transition
- prior revision records remain retained for historical traceability

## Current revision policy
In this first version:
- revision creation does not auto-activate operational status
- lifecycle mutation remains a separate explicit path
- revision status starts as `draft`

## Failure handling
Reject revision creation when:
- refinement request is missing
- target setup definition is missing
- request/setup linkage is invalid
- expected previous revision linkage does not match actual chain

Unexpected persistence/runtime failures return explicit `failed` outcomes with retry guidance.
