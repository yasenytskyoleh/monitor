# ADR-011: Aggregate-to-Hypothesis Evidence Trigger

## Status
Accepted

## Context
After ADR-010, Monitor can persist `EvaluationResult`, refresh `SetupAggregateResult`, and maintain deterministic aggregate evidence updates.

The next missing boundary is how refreshed aggregate evidence affects `ResearchHypothesis` state.

Without this boundary, hypotheses are defined but not updated from accumulated research evidence.

## Decision
Introduce a narrow runtime handoff contract for aggregate-to-hypothesis evidence updates:
- input: `AggregateHypothesisEvidenceTrigger`
- resolved command: `UpdateHypothesisFromAggregateCommand`
- output: `HypothesisEvidenceUpdateResult`
- coordinator: `createAggregateToHypothesisEvidenceHandoff`

Service ownership boundary:
- `ResearchService.updateHypothesisEvidence(...)` owns evidence interpretation and hypothesis evidence-state update semantics.
- runtime handoff coordinates validation, eligibility checks, and deterministic linkage resolution.

## First interpretation model
Use the first explicit evidence outcomes:
- `supports`
- `weakens`
- `inconclusive`

First deterministic rule in service layer:
- only `completed` aggregate status is eligible
- if aggregate metrics are incomplete, outcome is `inconclusive`
- if `averageFinalOutcome > 0` and `averagePercentageMove > 0` and positive-rate (`positiveOutcomeCount / completedEvaluations`) is at least `0.6`, outcome is `supports`
- if `averageFinalOutcome < 0` and `averagePercentageMove < 0` and positive-rate is at most `0.4`, outcome is `weakens`
- otherwise outcome is `inconclusive`

No probabilistic scoring, significance testing, or ranking is introduced in this slice.

## Ownership boundary
Aggregation side owns:
- aggregate computation lifecycle (`pending`, `completed`, `partial`, `invalid`)
- aggregate scope integrity
- aggregate metrics integrity

Hypothesis side owns:
- hypothesis linkage validation to setup definitions
- support/weakens/inconclusive evidence semantics
- evidence summary/note persistence on `ResearchHypothesis`

Runtime handoff owns:
- deterministic trigger validation
- completed-status eligibility gating for aggregate source
- explicit trigger outcomes and failure mapping

## Linkage and optionality rule (first version)
- one explicit target hypothesis per trigger
- target hypothesis id is resolved from trigger `researchHypothesisId` or aggregate linkage
- if no hypothesis linkage exists, update is rejected (`rejected_linkage`)
- fanout to multiple hypotheses is postponed

## Failure policy
- missing aggregate -> `rejected_validation`
- aggregate not in eligible lifecycle state -> `rejected_lifecycle`
- missing hypothesis linkage or missing hypothesis -> `rejected_linkage`
- malformed trigger or invalid evidence input -> `rejected_validation`
- unexpected runtime/service error -> `failed` with retry warning

No retry engine is introduced in this ADR.

## Consequences
Positive:
- Monitor now has an explicit runtime bridge from aggregate evidence to hypothesis evidence updates
- evidence interpretation is deterministic and service-managed
- aggregation and hypothesis ownership boundaries remain explicit

Trade-offs:
- first interpretation rule is intentionally simple
- partial aggregate handling is deferred
- only one target hypothesis is supported per trigger

## Explicitly postponed
- multi-hypothesis fanout
- significance/statistical confidence engine
- full hypothesis scoring/ranking
- automated hypothesis lifecycle transitions
- retry orchestration infrastructure
