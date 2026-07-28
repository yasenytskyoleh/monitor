# Routed Action Execution Result Storage Model

## Purpose
Record the storage classification for `RoutedActionExecutionResult` after the completed downstream execution-handoff persistence rollout.

## Classification
`routed_action_execution_result` is a product-ephemeral entity type.

It is a service response, not a durable product-domain record:
- `prepared` is durably represented by the created `routed_action_execution_envelope`
- `no_envelope`, `rejected_validation`, `rejected_lifecycle`, and `failed` can be returned with incomplete source context
- the result has no stable domain identity or service-owned repository write path

## Durable boundary
`routed_action_execution_envelope` remains the durable product-domain handoff record. It preserves the routed action, source routing result, source review decision, target references, payload snapshot, preparation metadata, and execution status.

Rejected and failed execution attempts are retained through the dedicated `ExecutionAttemptAudit`
boundary. It has explicit identity, ownership, retention, and runtime-evidence rules in
`docs/project/execution-attempt-audit-model.md`. Do not persist the current response type by
inference.

## Artifact locations
- `packages/domain-model/src/execution/routed-action-execution-result.ts`
- `packages/domain-model/src/storage/storage-boundary.ts`
- `docs/architecture/adr/ADR-086-routed-action-execution-result-storage-boundary.md`
- `docs/architecture/adr/ADR-102-retained-execution-attempt-audit-entity.md`
