# Setup Review Decision Model

## Decision record contract
Contract:
- `ResearchFeedbackDecision`
- `packages/domain-model/src/research/research-feedback-decision.ts`

Fields:
- `id`
- `setupDefinitionId`
- `researchHypothesisId`
- optional `setupAggregateResultId`
- `evidenceStatus`
- `recommendedAction`
- `rationaleSummary`
- `decisionStatus` (`proposed` | `reviewed` | `accepted` | `rejected`)
- `requiresManualReview`
- optional `evidenceSummary`
- optional `reviewerMetadata`
- `createdAt`
- `updatedAt`

## First recommendation outcomes
- `keep_active`
- `refine_definition`
- `pause_setup`
- `archive_setup`
- `manual_review_required`

## First recommendation rule
- `supports` -> `keep_active`
- `inconclusive` -> `manual_review_required`
- `weakens` + hypothesis `draft` -> `refine_definition`
- `weakens` + hypothesis `active` -> `pause_setup`
- `weakens` + hypothesis `paused` -> `archive_setup`
- fallback -> `manual_review_required`

## Failure boundaries
- missing hypothesis -> reject
- missing setup definition -> reject
- invalid/mismatched evidence status -> reject
- aggregate id provided but missing/mismatched -> reject
- decision record persistence failure -> fail with retry warning

## Review-state behavior (first version)
- newly created feedback decisions start as `proposed`
- later reviewer workflow may move to `reviewed`, `accepted`, or `rejected`
- no reviewer UI/queue is introduced in this slice

## Ownership
Evidence side owns:
- evidence status correctness
- evidence summary correctness

Research decision side owns:
- recommendation rule
- decision record persistence
- manual review requirement semantics
