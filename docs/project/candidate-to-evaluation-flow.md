# Candidate to Evaluation Flow

## Happy path (first version)
1. persisted `SignalCandidate` exists (`detected` or `under_review`)
2. runtime/application layer builds `SignalCandidateEvaluationTrigger`
3. evaluation window id is resolved (direct id or deterministic descriptor mapping)
4. duplicate candidate/window check runs
5. `EvaluationService.createPendingEvaluationResult` is called
6. `EvaluationService.startEvaluationResult` is called
7. explicit trigger result returns created evaluation-result id

Coordinator:
- `createSignalCandidateToEvaluationHandoff`
- `packages/domain-model/src/runtime-handoff/signal-candidate-to-evaluation.ts`

## Ownership boundaries
- candidate lifecycle ownership remains in candidate service/repository
- evaluation initiation ownership remains in evaluation service/repository
- trigger coordinator only validates and sequences handoff steps

## Failure boundaries
- missing candidate -> reject
- candidate/setup/symbol mismatch -> reject
- candidate lifecycle not triggerable -> reject
- duplicate candidate/window result already exists -> explicit duplicate outcome
- evaluation result create/start failure -> explicit failed or validation rejection

## Determinism rule
- trigger payload is explicit and structured
- window resolution is deterministic
- no freeform LLM judgment at this boundary

## Postponed work
- automatic evaluation scheduling
- replay/candle engine integration
- runtime workers/queues/retries infrastructure
- automatic window expiry/completion orchestration
