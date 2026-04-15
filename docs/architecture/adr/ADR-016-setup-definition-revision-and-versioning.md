# ADR-016: Setup-Definition Revision and Versioning Path

## Status
Accepted

## Context
After ADR-015, Monitor can create structured `SetupRefinementRequest` artifacts from approved `refine_definition` outcomes.

The next missing boundary is how a refinement request becomes an explicit setup-definition revision without silently mutating existing setup records.

## Decision
Introduce a revision handoff contract from refinement request to versioned setup-definition revision creation:
- input: `CreateSetupDefinitionRevisionCommand`
- output: `SetupDefinitionRevisionResult`
- revision artifact: `SetupDefinitionRevision`
- coordinator: `createSetupDefinitionRevisionHandoff`
- service entrypoint: `SetupDefinitionService.createRevision(...)`

## Versioning strategy (first version)
Use a setup-family + revision-chain model:
- logical setup lineage tracked by `setupFamilyId`
- each revision has immutable `version` and `revisionId`
- each revision links `previousRevisionId` when available

For first revision in a family, baseline setup is treated as pre-revision version `1`, and the first created revision is version `2`.

## Immutable history rule
- existing setup definitions are never rewritten during revision creation
- new revision creates a new `SetupDefinition` record (status `draft`)
- old setup and prior revisions remain queryable for audit and research traceability

## Ownership boundary
Refinement side owns:
- request rationale and proposed change summary (`SetupRefinementRequest`)

Revision side owns:
- version assignment
- previous/new linkage
- creation of `SetupDefinitionRevision` and new draft `SetupDefinition`

Lifecycle side owns:
- operational activation/pausing/archival decisions for revisions later

## Failure policy
- missing refinement request/setup -> `rejected_validation`
- refinement/setup linkage mismatch -> `rejected_linkage`
- invalid expected previous revision linkage -> `rejected_linkage`
- unexpected persistence/runtime failure -> `failed` with retry warning

No background workflow, auto-activation, or diff engine is introduced.

## Consequences
Positive:
- refinement work can now produce explicit, auditable setup revisions
- setup history remains immutable and traceable
- revision creation remains explicit and deterministic

Trade-offs:
- no automatic activation of new revisions
- no migration of historical links across revisions yet

## Explicitly postponed
- auto-activation of accepted revisions
- setup-diff engine
- revision approval queue/UI
- cross-entity migration between revisions
- full revision governance automation
