# Setup Revision Comparison Model

## Purpose
Define the first explicit query model for comparing two revisions of the same setup family.

This slice is descriptive and auditable.
It does not recommend activation or optimization actions.

## Comparison command contract
Source:
- `packages/domain-model/src/query/compare-setup-revisions-command.ts`

Key fields:
- `setupFamilyId`
- `baselineRevisionId`
- `targetRevisionId`
- optional `comparisonScope`
  - `evaluationWindowId`
  - `symbolIds`
  - `timeRange`
- `comparedAt`
- optional `originRunId`

## Comparison result contracts
Sources:
- `packages/domain-model/src/query/setup-revision-comparison.ts`
- `packages/domain-model/src/query/revision-comparison-metrics.ts`
- `packages/domain-model/src/query/revision-comparison-result.ts`

Result includes:
- explicit baseline/target revision context
- explicit scope used for comparison
- baseline metrics and target metrics
- per-metric deltas
- evidence counts per revision
- comparison status (`compared` or `insufficient_evidence`)
- warning/reason channel in envelope

## First compared metrics
- total evaluated candidates
- completed evaluations
- invalidated evaluations
- average percentage move
- average absolute move
- average final outcome proxy
- average max favorable excursion
- average max adverse excursion
- positive outcome count
- positive outcome rate

## Comparison service boundary
Source:
- `packages/domain-model/src/query/revision-history-query-service.ts`

Contract:
- `SetupComparisonQueryService.compareRevisions(...)`

Responsibilities:
- validate same-family lineage
- resolve baseline and target revisions
- apply one explicit scope to both revisions
- compute descriptive metric deltas
- return explicit compared/rejected/insufficient/failed result

## Failure boundaries
- missing selectors -> rejected
- missing baseline/target revision -> rejected
- baseline/target from different family -> rejected
- invalid scope -> rejected
- missing completed evidence -> insufficient_evidence
- unexpected failure -> failed

No fuzzy fallback or implicit cross-revision mixing is allowed.
