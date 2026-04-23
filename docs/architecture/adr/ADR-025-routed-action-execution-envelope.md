# ADR-025: Routed Action Execution Envelope

## Status
Accepted

## Context
After ADR-024, Monitor can deterministically route accepted review decisions to downstream action families.

The missing boundary is execution preparation: converting routing output into an explicit, auditable, execution-ready envelope without executing commands.

## Decision
Introduce a first execution-envelope model:
- input: `BuildRoutedActionExecutionEnvelopeCommand`
- envelope: `RoutedActionExecutionEnvelope`
- execution statuses: `prepared | ready | cancelled | failed`
- preparation result: `RoutedActionExecutionResult`
- preparation service: `DownstreamActionExecutionPreparationService.prepare(...)`

Execution preparation is separate from routing and separate from downstream command execution.

## First executable targets
Envelopes are produced for:
- `apply_setup_lifecycle_mutation`
- `create_setup_refinement_request`
- `activate_setup_revision`

`no_op_confirmed` remains auditable and returns an explicit no-envelope outcome.

## Route-to-command mapping
- lifecycle mutation route -> `ApplyApprovedSetupMutationCommand`
- refinement route -> `CreateSetupRefinementRequestCommand`
- revision activation route -> `ActivateSetupDefinitionRevisionCommand`

The envelope carries a typed payload snapshot and execution metadata only.

## Validation and failure policy
- missing routing result -> `rejected_validation`
- non-executable routing status/target mismatch -> `rejected_lifecycle`
- missing target references for mapped command -> `rejected_validation`
- no-op target -> `no_envelope`
- persistence/preparation failure -> `failed`

No silent fallback to default executable actions.

## Determinism boundary
In this slice:
- no LLM command generation
- no hidden policy engine
- no implicit command execution
- no queue/worker runtime

## Consequences
Positive:
- routing intent becomes a durable execution-ready command envelope
- envelope includes source routing and review-decision traceability
- future executors can consume a stable command-wrapper artifact

Trade-offs:
- no execution runtime yet
- no retry scheduler or workflow/task center

## Explicitly postponed
- downstream command execution engine
- queue/worker orchestration
- retry scheduler
- execution UI/task center
