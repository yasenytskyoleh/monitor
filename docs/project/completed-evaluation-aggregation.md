# Completed-Evaluation Aggregation

## Purpose

`@monitor/evaluation-aggregation` refreshes durable setup evidence from one completed
`EvaluationResult`. It is provider-neutral: it receives only persisted evaluation identity and a
trigger timestamp, then delegates aggregate creation and recomputation to the existing domain
handoff.

## Behavior

- The runtime resolves the evaluation and its linked signal candidate before any aggregate write.
- Only completed evaluations are eligible. Missing records, malformed requests, and inconsistent
  candidate lookups return explicit rejection outcomes.
- The pilot scope is deterministic: setup definition, the candidate's canonical symbol, and the
  persisted evaluation window. The domain handoff supplies its established all-history range.
- The first refresh creates and computes the aggregate; later refreshes recompute the same scope.
- Metadata traces each refresh to its evaluation-result ID without retaining provider or candle
  payloads.

## Operational limits

- Callers invoke this runtime explicitly. There is no automatic chaining from candle evaluation,
  batch worker, scheduler, checkpointing, or retry queue.
- It does not calculate metrics, score aggregates, update research hypotheses, or perform trading.
- Failed refreshes return a retry-safe `failed` outcome; durable aggregate idempotency remains
  owned by the domain aggregation handoff.
