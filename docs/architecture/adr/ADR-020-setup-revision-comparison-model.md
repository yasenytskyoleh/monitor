# ADR-020: Setup Revision Comparison Model

## Status
Accepted

## Context
After ADR-019, Monitor can query revision-aware history by setup family and by exact revision.

The next missing boundary is direct before/after comparison of two revisions in the same setup family.

## Decision
Introduce explicit revision-comparison contracts in the query layer:
- input: `CompareSetupRevisionsCommand`
- descriptive output object: `SetupRevisionComparison`
- result envelope: `RevisionComparisonResult`
- query service entrypoint: `SetupComparisonQueryService.compareRevisions(...)`

This path compares baseline vs target revisions without ranking, scoring, or automation.

## Baseline/target semantics
- `baselineRevisionId` = prior reference revision
- `targetRevisionId` = candidate/newer revision under review
- both revision ids are mandatory and explicit
- both revisions must belong to the same `setupFamilyId`

## First compared metrics
First slice compares descriptive metrics only:
- total evaluated candidates
- completed evaluations
- invalidated evaluations
- average percentage move
- average absolute move
- average final outcome proxy
- average max favorable excursion
- average max adverse excursion
- positive outcome count and positive outcome rate

Result includes baseline values, target values, and explicit deltas.

## Scope and comparability rules
- comparison scope is explicit (`evaluationWindowId`, `symbolIds`, `timeRange`)
- same scope is applied to baseline and target
- ambiguous or invalid scope selectors are rejected
- missing evidence is explicit (`insufficient_evidence`), not hidden

## Determinism boundary
In this slice:
- no ranking engine
- no optimization engine
- no automatic activation recommendation
- no significance/confidence model

Comparison remains descriptive and auditable.

## Failure policy
- missing family/baseline/target selectors -> `rejected`
- missing baseline/target revision -> `rejected`
- cross-family comparison attempt -> `rejected`
- invalid scope -> `rejected`
- insufficient evidence -> `insufficient_evidence`
- unexpected query failure -> `failed`

No fallback-to-latest behavior is introduced.

## Consequences
Positive:
- before/after refinement evidence can be compared explicitly
- comparison output preserves revision-scoped traceability
- research and review workflows can consume deltas without black-box scoring

Trade-offs:
- still a thin query model, not a reporting platform
- caller must provide explicit baseline/target and scope

## Explicitly postponed
- scoring/ranking/optimization logic
- automatic revision promotion decisions
- statistical significance/confidence analysis
- UI/reporting/caching infrastructure
