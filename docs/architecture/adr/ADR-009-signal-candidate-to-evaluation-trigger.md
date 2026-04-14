# ADR-009: Signal-Candidate to Evaluation Trigger

## Status
Accepted

## Context
Detection-to-candidate runtime handoff is defined and persisted candidates now exist.
The next required runtime bridge is from persisted candidate state into controlled evaluation initiation.

## Decision
Introduce a narrow runtime handoff contract for evaluation start:
- input contract: `SignalCandidateEvaluationTrigger`
- resolved command shape: `StartEvaluationCommand`
- result contract: `EvaluationTriggerResult`
- coordinator: `createSignalCandidateToEvaluationHandoff`

Coordinator behavior:
- validates trigger payload
- checks candidate existence/reference consistency
- enforces lifecycle gate (`detected` or `under_review`)
- resolves evaluation window id deterministically
- rejects duplicate candidate/window evaluation starts
- creates pending result and starts evaluation through `EvaluationService`

## Ownership boundary
- Candidate service/repository own candidate lifecycle and persistence
- Evaluation service/repository own evaluation-result initiation and lifecycle
- Runtime handoff layer coordinates boundary logic only

## Failure policy
- invalid trigger or reference mismatch -> `rejected_validation`
- disallowed candidate lifecycle -> `rejected_lifecycle`
- duplicate candidate/window evaluation -> `rejected_duplicate`
- unexpected failures -> `failed` with explicit retry warning

## Consequences
Positive:
- explicit candidate-to-evaluation runtime bridge exists
- deterministic trigger path is testable before full engine work
- preserves separation between runtime evidence and product persistence

Trade-offs:
- window resolution is intentionally simple
- no runtime scheduling/retry orchestration in this slice

## Explicitly postponed
- full evaluation engine runtime
- replay/candle processing integration
- background schedulers/workers/queues
- automatic completion/expiry orchestration
