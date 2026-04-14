# ADR-008: Monitoring-to-Product Runtime Handoff

## Status
Accepted

## Context
Product-domain persistence and first application flow are already defined.
The remaining gap is a runtime bridge from monitoring/detection output into product-side candidate persistence.

## Decision
Introduce a narrow, deterministic runtime handoff contract for candidate creation:
- detection output is represented as `DetectionToCandidateCommand`
- handoff coordinator maps command to `SignalCandidateService.createSignalCandidate`
- result is explicit via `RuntimeHandoffResult`

## Ownership boundary
Detection side owns:
- normalized observation handling
- deterministic rule evaluation
- detection hit generation

Product side owns:
- candidate validation/persistence
- setup/symbol reference checks
- duplicate policy handling

Detection does not persist product records directly.

## Failure policy
- malformed/invalid command -> `rejected_validation`
- missing setup/symbol references -> `rejected_validation`
- duplicate detection hit under current policy -> `rejected_duplicate`
- unexpected runtime/service failure -> `failed` with retry warning

No distributed transaction or runtime queue semantics are introduced in this ADR.

## Consequences
Positive:
- explicit runtime-to-product boundary exists
- deterministic handoff keeps behavior auditable
- candidate creation path is testable before full runtime implementation

Trade-offs:
- retry orchestration remains manual/deferred
- no automatic background recovery in this slice

## Explicitly postponed
- live monitoring and websocket runtime implementation
- detection engine runtime internals
- queue/worker retry infrastructure
- event bus architecture
