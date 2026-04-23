# Revision-Aware Runtime Model

## Purpose
Define the first explicit runtime model for resolving and consuming setup-definition revisions after revision activation.

This slice adds resolution and reference contracts only.
It does not add live cache/event infrastructure.

## Runtime resolution contract
Contracts:
- `ResolveActiveSetupRevisionCommand`
- `ActiveSetupRevisionResolution`
- `SetupRevisionResolutionResult`
- `RuntimeSetupRevisionRef`

Sources:
- `packages/domain-model/src/runtime-handoff/resolve-active-setup-revision-command.ts`
- `packages/domain-model/src/runtime-handoff/active-setup-revision-resolution.ts`
- `packages/domain-model/src/runtime-handoff/setup-revision-resolution-result.ts`
- `packages/domain-model/src/runtime-handoff/runtime-setup-revision-ref.ts`

Coordinator:
- `createActiveSetupRevisionResolutionHandoff`
- `packages/domain-model/src/runtime-handoff/resolve-active-setup-revision.ts`

Service boundary:
- `SetupDefinitionService.resolveActiveRevision(...)`
- `packages/domain-model/src/services/setup-definition-service.ts`

## Candidate revision linkage contract
`SignalCandidate` now includes explicit revision linkage:
- `setupRevisionId`

Source:
- `packages/domain-model/src/signal-candidate.ts`

Detection handoff command also requires revision context:
- `DetectionToCandidateCommand.setupRevisionId`

Source:
- `packages/domain-model/src/runtime-handoff/detection-to-candidate-command.ts`

## First consistency rules
- runtime resolves one active revision per setup family
- no active revision -> reject
- multiple active revisions -> reject
- detection handoff rejects revision mismatch vs resolved active revision context
- historical records retain original revision reference; no retroactive rebinding
- revision activation changes future runtime resolution only

## Determinism boundary
- no fuzzy "best revision" logic
- no fallback-to-latest heuristics
- no LLM judgment at revision selection
- explicit contracts only

## Failure boundaries
- missing setup selector (`setupDefinitionId`/`setupFamilyId`) -> reject
- target setup family missing -> reject
- no active revision -> reject
- multiple active revisions -> reject
- candidate command missing `setupRevisionId` -> reject
- candidate command revision mismatch -> reject
- unexpected service/runtime failures -> failed + retry warning

## Postponed work
- live runtime revision switching/cache invalidation
- revision activation event distribution
- historical migration/rebinding
- batch/runtime reprocessing after activation
