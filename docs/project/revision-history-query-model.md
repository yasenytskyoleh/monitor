# Revision History Query Model

## Purpose
Define the first explicit query boundary for revision-aware historical evidence.

This slice adds deterministic selectors, grouped views, and explicit rejection behavior.
It does not add dashboard/reporting infrastructure.

## Query contracts
Sources:
- `packages/domain-model/src/query/query-setup-revision-history.ts`
- `packages/domain-model/src/query/query-signal-candidates-by-revision.ts`
- `packages/domain-model/src/query/query-evaluation-results-by-revision.ts`
- `packages/domain-model/src/query/query-aggregate-evidence-by-revision-scope.ts`

Key selectors:
- `setupFamilyId`
- `setupRevisionId`
- optional status filters (`revisionStatuses`, candidate/evaluation/aggregate statuses)
- optional `timeRange`
- optional `symbolId`

## Query result contracts
Sources:
- `packages/domain-model/src/query/setup-revision-history-view.ts`
- `packages/domain-model/src/query/revision-history-query-result.ts`

Result model includes:
- explicit status (`resolved` | `rejected` | `failed`)
- explicit family/revision context
- grouped revision views for family queries
- explicit warning channel for partial/non-fatal issues

## Primary query modes
- `family_history`
- `single_revision`
- `family_comparison`

Mode semantics are explicit and deterministic.
Selectors that violate mode boundaries are rejected.

## Query coordination service
Source:
- `packages/domain-model/src/query/revision-history-query-service.ts`

Service methods:
- `queryHistory(...)`
- `getFamilyHistory(...)`
- `getByRevision(...)` (signal candidates)
- `getEvaluationsByRevision(...)`
- `getByRevisionScope(...)` (aggregates)

## Historical consistency guarantees
- records remain bound to original revision context
- superseded revisions remain explorable
- single-revision query cannot include other revisions
- family queries return explicit per-revision grouping
- no retroactive rebinding to new active revisions

## Failure boundaries
- missing family selector -> rejected
- missing revision selector -> rejected
- unknown family/revision -> rejected
- mixed family/revision mismatch -> rejected
- unexpected query failure -> failed + retry warning

No fallback-to-latest heuristic is allowed in this slice.
