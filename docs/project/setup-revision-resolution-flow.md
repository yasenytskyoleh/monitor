# Setup Revision Resolution Flow

## Happy path
1. setup family has one active operational revision
2. runtime builds `ResolveActiveSetupRevisionCommand`
3. `createActiveSetupRevisionResolutionHandoff.resolve(...)` is called
4. `SetupDefinitionService.resolveActiveRevision(...)` validates selector and active state
5. runtime receives `SetupRevisionResolutionResult(status=resolved)` with `RuntimeSetupRevisionRef`
6. detection handoff creates `SignalCandidate` with `setupRevisionId`
7. downstream evaluation/aggregation can trace lineage through candidate revision reference

## Runtime coordination path
- resolution command: `ResolveActiveSetupRevisionCommand`
- resolution coordinator: `createActiveSetupRevisionResolutionHandoff`
- detection command: `DetectionToCandidateCommand`
- detection coordinator: `createSignalCandidateFromDetectionHandoff`

## Mid-stream revision change rule
- records keep the revision reference resolved for their creation context
- activation updates affect later runtime resolution
- old records are not rebound to newer revisions

## Failure examples
- missing setup selector -> `rejected`
- setup family missing -> `rejected`
- no active revision -> `rejected`
- multiple active revisions -> `rejected`
- candidate creation without `setupRevisionId` -> `rejected_validation`
- candidate command revision mismatch -> `rejected_validation`
- unexpected failure -> `failed`

## Ownership boundary
Revision activation side owns:
- active revision selection
- superseding behavior

Runtime consumption side owns:
- active revision resolution at runtime
- attaching revision id to new runtime/product records

Product persistence side owns:
- storing revision-aware references on created records
- preserving immutable historical lineage
