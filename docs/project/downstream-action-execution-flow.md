# Downstream Action Execution Flow

## Happy path
1. Routed decision result exists.
2. `BuildRoutedActionExecutionEnvelopeCommand` is created with target refs and preparation metadata.
3. Routing result linkage and target consistency are validated.
4. Route target is mapped to downstream command type.
5. Typed payload snapshot is assembled.
6. `RoutedActionExecutionEnvelope` is persisted with `prepared` status.
7. Envelope result is returned for later execution consumption.

## No-op path
When routed target is `no_op_confirmed`:
- no executable envelope is created
- explicit `no_envelope` result is returned
- result remains auditable by source routing identifiers

## Failure examples
- missing routing result id -> `rejected_validation`
- routing result not found -> `rejected_validation`
- non-routed/non-no_action source status -> `rejected_lifecycle`
- target mismatch vs routing result -> `rejected_lifecycle`
- missing target refs needed by mapped command -> `rejected_validation`
- envelope persistence failure -> `failed`

## Boundary rules
- execution preparation is separate from routing
- execution preparation is separate from actual execution
- envelope carries command payload + metadata snapshot only
- no queue/worker runtime or retry scheduler in this slice
