# Signal Candidate Model

## Purpose
Define the first persisted market-side product object that connects detection outputs to later evaluation and research.

`SignalCandidate` represents:
- "a setup was detected for a monitored symbol"
- a product-domain record with lifecycle and write ownership

It does not represent:
- raw monitoring events
- full detection runtime internals
- evaluation outcomes

## Persisted model (current)
`SignalCandidate` fields:
- `id`
- `setupDefinitionId`
- `setupRevisionId`
- `monitoredSymbolId`
- `detectionHitId` (optional placeholder)
- `status` (`detected` | `under_review` | `evaluated` | `discarded`)
- `detectedAt`
- `evidenceSummary`
- `originRunId` (optional)
- `createdAt`
- `updatedAt`

Contract source:
- `packages/domain-model/src/signal-candidate.ts`

## Service and repository ownership
- `SignalCandidateService` owns:
  - create from validated detection-side input
  - lifecycle status transitions
  - reference validation (`SetupDefinition`, `MonitoredSymbol`)
- `SignalCandidateRepository` owns persistence and retrieval only

Implementation sources:
- `packages/domain-model/src/services/signal-candidate-service.ts`
- `packages/domain-model/src/repositories/signal-candidate-repository.impl.ts`

## Lifecycle rules (current)
- creation must start with `detected`
- allowed transitions:
  - `detected` -> `under_review`
  - `detected` -> `discarded`
  - `under_review` -> `evaluated`
  - `under_review` -> `discarded`
- invalid transitions are rejected by service validation
- `evaluated` and `discarded` are terminal in this slice

## Boundary and relationships
- must reference:
  - one `SetupDefinition`
  - one explicit `SetupDefinitionRevision` (`setupRevisionId`)
  - one `MonitoredSymbol`
- optional linkage to orchestrator run context can be carried as metadata (`originRunId`) only
- runtime evidence under `runtime/runs/*` remains separate from product-domain persistence

Future linkage:
- `EvaluationResult` will reference `SignalCandidate`

## Out of scope in this slice
- detection runtime engine implementation
- live market ingestion logic
- evaluation-result persistence implementation
- aggregation/scoring runtime
