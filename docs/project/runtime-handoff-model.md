# Runtime Handoff Model

## Purpose
Define the first runtime boundary between monitoring/detection output and product-domain persistence for signal candidate creation.

This slice defines contracts and coordination only.
It does not implement the live monitoring loop or full detection runtime engine.

## Boundary definition
Detection side produces a structured detection hit command.
Product side decides whether/how that command becomes a persisted `SignalCandidate`.

Detection side owns:
- normalized event observation
- deterministic rule evaluation
- detection-hit payload production

Product side owns:
- reference validation
- duplicate policy enforcement
- candidate persistence
- candidate lifecycle ownership

## First handoff command
Contract:
- `DetectionToCandidateCommand`
- `packages/domain-model/src/runtime-handoff/detection-to-candidate-command.ts`

Minimum fields:
- `setupDefinitionId`
- `monitoredSymbolId`
- `detectedAt`
- optional `detectionHitId`
- `evidenceSummary`
- optional `originRunId`
- optional source metadata
- optional `candidateId`

## First handoff result
Contract:
- `RuntimeHandoffResult`
- `packages/domain-model/src/runtime-handoff/runtime-handoff-result.ts`

Statuses:
- `created`
- `rejected_validation`
- `rejected_duplicate`
- `failed`

## First coordination path
1. normalized monitoring event exists
2. detection rule produces structured hit payload
3. handoff command created (`DetectionToCandidateCommand`)
4. product handoff coordinator validates command
5. `SignalCandidateService.createSignalCandidate` is called
6. explicit handoff result is returned

Coordinator:
- `createSignalCandidateFromDetectionHandoff`
- `packages/domain-model/src/runtime-handoff/signal-candidate-from-detection.ts`

## Determinism rule
- detection side remains deterministic and rule-based
- handoff payload is explicit and structured
- no freeform LLM judgment at this boundary
- no hidden candidate creation logic

## Failure behavior
Failure cases:
- invalid command shape -> `rejected_validation`
- missing setup definition -> `rejected_validation`
- missing monitored symbol -> `rejected_validation`
- duplicate detection-hit policy hit -> `rejected_duplicate`
- unexpected service/runtime error -> `failed` + retry warning

No distributed transactions are introduced in this slice.
