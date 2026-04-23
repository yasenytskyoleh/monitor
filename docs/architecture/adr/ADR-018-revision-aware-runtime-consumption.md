# ADR-018: Revision-Aware Runtime Consumption

## Status
Accepted

## Context
After ADR-017, Monitor can create and activate setup-definition revisions with one operational active revision per setup family.

The missing boundary is runtime consumption: monitoring and detection flows still need an explicit contract for resolving and attaching revision context to new runtime/product records.

## Decision
Introduce revision-aware runtime consumption contracts:
- runtime resolution input: `ResolveActiveSetupRevisionCommand`
- runtime resolution output: `SetupRevisionResolutionResult`
- runtime resolution payload: `ActiveSetupRevisionResolution` + `RuntimeSetupRevisionRef`
- runtime coordinator: `createActiveSetupRevisionResolutionHandoff`
- service entrypoint: `SetupDefinitionService.resolveActiveRevision(...)`

Also make candidate creation revision-aware:
- `DetectionToCandidateCommand` requires `setupRevisionId`
- `SignalCandidate` now stores `setupRevisionId`
- detection handoff validates command revision against resolved active revision context

## Resolution and traceability rules
First-version runtime rules:
- runtime must resolve active revision explicitly via service contract
- new `SignalCandidate` records must carry explicit revision reference (`setupRevisionId`)
- historical records keep the revision reference they were created with
- revision activation affects future runtime resolution; no retroactive rebinding of history

## Failure policy
- missing selector or invalid command shape -> `rejected`
- missing setup family/revision context -> `rejected`
- no active revision -> `rejected`
- multiple active revisions in one family -> `rejected`
- candidate command revision mismatch vs resolved active revision -> `rejected_validation`
- unexpected runtime/service failure -> `failed` with retry warning

No fallback-to-latest or heuristic revision selection is introduced.

## Determinism boundary
In this slice:
- no LLM judgment at runtime revision selection
- no hidden "latest wins" rule
- no silent rebinding of old records to newly activated revisions

Runtime consumes explicit active-revision resolution only.

## Consequences
Positive:
- runtime now has deterministic active-revision lookup
- new candidates preserve exact revision lineage for later evaluation and aggregation interpretation
- revision governance and runtime consumption are explicitly connected

Trade-offs:
- runtime must provide explicit revision context on candidate handoff
- invalid/missing revision context fails closed instead of guessing

## Explicitly postponed
- live runtime cache invalidation/distribution
- event bus propagation for revision activation
- retroactive migration/rebinding of historical records
- automatic candidate/evaluation reprocessing across revision changes
