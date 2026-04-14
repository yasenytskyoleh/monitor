# Research Feedback Loop

## Purpose
Define the first minimal loop from updated hypothesis evidence into explicit setup-review recommendations.

This slice closes the contract loop:
`idea -> setup definition -> signal candidate -> evaluation result -> aggregate evidence -> hypothesis evidence update -> setup feedback decision`

## Feedback boundary
Evidence side provides:
- persisted `ResearchHypothesis` with latest evidence status
- optional linked aggregate result id
- optional evidence summary

Decision side provides:
- deterministic recommendation (`keep_active`, `refine_definition`, `pause_setup`, `archive_setup`, `manual_review_required`)
- durable `ResearchFeedbackDecision` record
- explicit manual-review requirement

## Trigger input contract
Contract:
- `HypothesisFeedbackDecisionTrigger`
- `packages/domain-model/src/runtime-handoff/hypothesis-feedback-decision-trigger.ts`

Fields:
- `researchHypothesisId`
- `setupDefinitionId`
- `latestEvidenceStatus`
- optional `setupAggregateResultId`
- `triggeredAt`
- optional `evidenceSummary`
- optional `originRunId`
- optional `sourceMetadata`

## Coordination path (first version)
1. updated hypothesis evidence exists
2. runtime/application builds `HypothesisFeedbackDecisionTrigger`
3. handoff validates references/linkage deterministically
4. `ResearchService.reviewSetupFromEvidence(...)` is called
5. `ResearchFeedbackDecision` is created with `decisionStatus=proposed`
6. explicit `FeedbackDecisionResult` returns recommendation + ids

Coordinator:
- `createHypothesisEvidenceToSetupFeedbackHandoff`
- `packages/domain-model/src/runtime-handoff/hypothesis-evidence-to-setup-feedback.ts`

## Determinism rules
- no freeform LLM reasoning at this boundary
- no hidden setup mutation logic
- explicit rule-based recommendation only
- explicit rejection/failure outcomes

## Manual vs automated boundary
First version is recommendation-first.

Current behavior:
- recommendation and rationale are recorded
- setup definition lifecycle/mutations remain manual or separately approved

Not in this slice:
- auto setup rewrite
- auto pause/archive execution
- auto hypothesis closure
