# Hypothesis Evidence Model

## Purpose
Define the first product/runtime contract for updating `ResearchHypothesis` evidence state from refreshed `SetupAggregateResult` records.

This slice is contract-level and deterministic.
It does not introduce a full hypothesis engine.

## Boundary definition
Aggregation side provides:
- persisted `SetupAggregateResult` identity
- setup linkage
- aggregate lifecycle status
- aggregate metrics bundle for interpretation

Hypothesis side provides:
- hypothesis linkage validation
- evidence interpretation (`supports` / `weakens` / `inconclusive`)
- hypothesis evidence-state update and evidence summary notes

Runtime handoff provides:
- trigger validation
- eligibility checks (`completed` aggregate only)
- explicit result statuses

## Trigger input contract
Contract:
- `AggregateHypothesisEvidenceTrigger`
- `packages/domain-model/src/runtime-handoff/aggregate-hypothesis-evidence-trigger.ts`

Fields:
- `setupAggregateResultId`
- `setupDefinitionId`
- optional `researchHypothesisId`
- `triggeredAt`
- optional `evidenceScopeDescriptor`
- optional `originRunId`
- optional `sourceMetadata`

## Service update contract
Contract:
- `ResearchService.updateHypothesisEvidence(...)`
- `packages/domain-model/src/services/research-service.ts`

First request fields (summary):
- target hypothesis id
- aggregate identity + setup id
- aggregate lifecycle status
- aggregate metrics needed for interpretation
- assessed timestamp and optional scope metadata

Service writes:
- `ResearchHypothesis.evidenceStatus`
- `ResearchHypothesis.evidenceSummary`
- `ResearchHypothesis.lastEvidenceAggregateResultId`
- `ResearchHypothesis.lastEvidenceAssessedAt`
- appended note in `ResearchHypothesis.notes`

## First interpretation semantics
Allowed outcomes:
- `supports`
- `weakens`
- `inconclusive`

First deterministic rule:
- only `completed` aggregate is eligible
- if metrics required for interpretation are missing -> `inconclusive`
- if `averageFinalOutcome > 0`, `averagePercentageMove > 0`, and positive rate (`positiveOutcomeCount / completedEvaluations`) >= `0.6` -> `supports`
- if `averageFinalOutcome < 0`, `averagePercentageMove < 0`, and positive rate <= `0.4` -> `weakens`
- otherwise -> `inconclusive`

## Linkage and optionality rules
- one explicit target hypothesis per trigger
- target hypothesis id resolves from trigger or aggregate linkage
- if no linked hypothesis is available, no update occurs and trigger is rejected (`rejected_linkage`)
- fanout to multiple hypotheses is postponed

## Determinism rules
- no freeform LLM reasoning at this boundary
- no hidden judgment logic
- only explicit aggregate inputs and explicit interpretation rules are used

## Out of scope
- full scoring/ranking engine
- significance/statistical confidence logic
- automatic lifecycle transitions for hypotheses
- multi-hypothesis fanout
- retry or scheduling infrastructure
