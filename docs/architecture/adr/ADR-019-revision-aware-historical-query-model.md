# ADR-019: Revision-Aware Historical Query Model

## Status
Accepted

## Context
After ADR-018, runtime writes new product records with explicit `setupRevisionId` lineage.

The missing boundary is read/query semantics: users and services need deterministic ways to inspect history by setup family or exact revision without mixing evidence across revisions.

## Decision
Introduce first revision-aware historical query contracts under `packages/domain-model/src/query`:
- family/revision query selectors (`QuerySetupRevisionHistory`, `QuerySignalCandidatesByRevision`, `QueryEvaluationResultsByRevision`, `QueryAggregateEvidenceByRevisionScope`)
- explicit query modes (`family_history`, `single_revision`, `family_comparison`)
- explicit view/result contracts (`SetupRevisionHistoryView`, `Revision*HistoryView`, `RevisionHistoryQueryResult`)
- thin query service (`createRevisionHistoryQueryService`) with deterministic selector validation and grouping behavior

## Query semantics
Rule set for first slice:
- family-level and revision-level queries are distinct
- family-history query cannot silently accept revision selector
- single-revision query requires explicit `setupRevisionId`
- mixed family/revision mismatch is rejected as ambiguous
- superseded revisions remain queryable
- grouped family views keep explicit per-revision tagging and counts

## Historical consistency rules
- historical records remain bound to creation revision (`setupRevisionId`)
- no retroactive reassignment to newer revisions
- single-revision query never includes other revisions
- family query may span revisions but returns grouped revision contexts explicitly

## Failure policy
- missing selector (`setupFamilyId`/`setupRevisionId`) -> `rejected`
- unknown family or revision -> `rejected`
- mixed family/revision ambiguity -> `rejected`
- unexpected repository/query failure -> `failed` with retry warning

No fallback-to-latest behavior is introduced.

## Consequences
Positive:
- revision-aware storage now has explicit revision-aware query semantics
- superseded and active revisions can be inspected without ambiguity
- comparative history can be built with deterministic grouping

Trade-offs:
- this is contract-level query orchestration, not an optimized read-model platform
- query callers must provide explicit selectors and mode

## Explicitly postponed
- dedicated read-model database and denormalized projections
- dashboard/reporting APIs and UI models
- query caching/optimization layer
- revision diff visualizer and ranking/scoring across revisions
