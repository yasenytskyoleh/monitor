# Setup Family History View

## Purpose
Define the first family-level grouped historical view for setup revisions.

## View shape
Contract:
- `SetupRevisionHistoryView`
- `packages/domain-model/src/query/setup-revision-history-view.ts`

Core fields:
- `mode` (`family_history` | `family_comparison`)
- `setupFamilyId`
- `revisionGroups[]`
- `totals`

Each revision group includes:
- revision identity (`setupRevisionId`, `version`, `revisionStatus`)
- setup linkage (`setupDefinitionId`, `setupFamilyId`, setup-definition status)
- matched candidates/evaluations/aggregates
- explicit per-revision counts

## Grouping rules
- groups are revision-scoped, not merged across revisions
- superseded revisions remain visible unless explicitly filtered out
- records are matched by revision context (`setupRevisionId`) and setup-definition lineage
- totals are computed from grouped records, not inferred heuristically

## Mode usage
`family_history`:
- timeline-style grouped inspection across revisions

`family_comparison`:
- same grouped data, intended for side-by-side revision comparison
- no ranking/scoring semantics in this slice

## Failure handling
- missing family selector -> rejected
- unknown family -> rejected
- invalid mixed family/revision selector usage -> rejected
- missing setup-definition linkage for a revision -> warning + explicit group flag (`missing_setup_definition`)
