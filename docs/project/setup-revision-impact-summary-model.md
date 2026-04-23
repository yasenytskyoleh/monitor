# Setup Revision Impact Summary Model

## Purpose
Define the first structured impact summary for baseline vs target setup revision comparison output.

This model is descriptive and auditable.
It is not a decision or automation model.

## Boundary
Comparison side provides:
- baseline/target revision identity
- scope
- metric deltas
- evidence counts

Summary side owns:
- impact classification
- evidence sufficiency labeling
- concise summary notes and warnings

## Summary command contract
Source:
- `packages/domain-model/src/query/build-setup-revision-impact-summary-command.ts`

Fields:
- `setupFamilyId`
- `baselineRevisionId`
- `targetRevisionId`
- optional `revisionComparisonId` (reference placeholder)
- optional `comparison` (direct comparison payload reference)
- optional `summaryScope`
- `summarizedAt`
- optional `originRunId`

First version requires direct `comparison` payload reference.
`revisionComparisonId` lookup is explicitly postponed.

## Summary result contracts
Sources:
- `packages/domain-model/src/query/setup-revision-impact-summary.ts`
- `packages/domain-model/src/query/revision-impact-classification.ts`
- `packages/domain-model/src/query/revision-impact-summary-result.ts`

Summary artifact includes:
- explicit family/baseline/target context
- baseline/target versions
- summary scope
- impact classification
- evidence sufficiency
- key metric change set
- evidence counts
- notes and warnings
- generated timestamp

## Coordination path
1. Revision comparison result exists.
2. Summary command is constructed.
3. Comparison payload and scope consistency are validated.
4. Evidence sufficiency is assessed.
5. Impact classification is derived from key metric deltas.
6. Structured impact summary is returned.

## Failure boundaries
- missing command selectors -> rejected
- missing comparison payload -> rejected
- mismatch between command and comparison revision selectors -> rejected
- summary scope mismatch -> rejected
- unexpected service failure -> failed

Insufficient evidence is represented explicitly in the summary, not hidden behind failure.
