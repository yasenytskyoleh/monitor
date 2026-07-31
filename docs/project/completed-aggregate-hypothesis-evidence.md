# Completed Aggregate Hypothesis Evidence Runtime

`@monitor/hypothesis-evidence` is the explicit, provider-neutral coordinator from one persisted,
completed `SetupAggregateResult` to the existing aggregate-to-hypothesis evidence handoff.

## Boundary

`updateFromCompletedAggregate({ setupAggregateResultId, triggeredAt })`:

1. resolves one persisted aggregate and requires `completed` status;
2. forwards its setup, linked hypothesis, and immutable aggregation scope to
   `createAggregateToHypothesisEvidenceHandoff`;
3. records the aggregate identity as the metadata trace id; and
4. returns the domain-owned `HypothesisEvidenceUpdateResult` unchanged.

The domain handoff and `ResearchService` remain responsible for hypothesis linkage validation,
evidence interpretation, and persistence. This package does not read provider payloads, recompute
aggregate metrics, or make setup-feedback decisions.

## Operational behavior

- Missing, malformed, and non-completed aggregate requests are rejected before the handoff.
- Missing or invalid hypothesis linkage is returned as the handoff's explicit outcome.
- Unexpected runtime failures return a retryable `failed` outcome; re-running an eligible aggregate
  safely refreshes its latest hypothesis evidence.

## Out of scope

- scheduled or batch processing;
- multi-hypothesis fanout;
- statistical confidence, scoring, and automated hypothesis lifecycle changes;
- setup-feedback decisions, alerts, and trading execution.
