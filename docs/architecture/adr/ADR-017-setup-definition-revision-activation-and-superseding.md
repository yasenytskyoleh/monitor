# ADR-017: Setup-Definition Revision Activation and Superseding Path

## Status
Accepted

## Context
After ADR-016, Monitor can create immutable, versioned `SetupDefinitionRevision` records and new draft setup-definition revisions.

The next missing boundary is operational selection: which revision in a setup family is currently active.

## Decision
Introduce explicit revision activation contracts:
- input: `ActivateSetupDefinitionRevisionCommand`
- output: `SetupRevisionActivationResult`
- activation audit artifact: `SetupRevisionActivationRecord`
- coordinator: `createSetupRevisionActivationHandoff`
- service entrypoint: `SetupDefinitionService.activateRevision(...)`

## Eligibility and one-active rule
First-version activation rules:
- only one active revision per setup family is allowed
- only revisions in `accepted` status may be activated
- activation is explicit and targets exactly one revision
- activation does not create revisions

## Superseding behavior
When activation switches to a different accepted target revision:
- previously active revision becomes `superseded`
- previous setup-definition status is moved out of operational `active` (paused)
- historical revisions remain immutable and queryable

## Manual-first boundary
In this slice:
- no auto-activation on revision creation
- no hidden "latest wins" rule
- no silent superseding
- activation remains a separate explicit action

## Failure policy
- missing target revision -> `rejected`
- non-accepted revision -> `rejected`
- family/linkage mismatch or multiple-active conflict -> `rejected`
- unexpected persistence/runtime failure -> `failed` with retry warning

No conflict-resolution engine or automation queue is introduced.

## Consequences
Positive:
- operational revision selection is now explicit and auditable
- superseding history remains queryable and immutable
- one-active-revision rule is enforced deterministically

Trade-offs:
- activation remains manual and narrowly scoped
- no rollback or auto-resolution workflow yet

## Explicitly postponed
- auto-activation from revision acceptance
- batch activation jobs
- activation conflict-resolution engine
- activation UI/dashboard and policy workflow
