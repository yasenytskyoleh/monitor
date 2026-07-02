# Routed Action Execution Envelope Relational Adapter Model

## Purpose
Define the repository-adapter rollout contract for `routed_action_execution_envelope`.

This step formalizes:
- repository-to-adapter boundaries
- deterministic persistence-error mapping
- reference validation responsibilities

for the execution-envelope slice with committed physical schema artifacts but without yet extending the shared implemented-product bundle through routed-action execution envelopes.

## Contract sources
- `packages/domain-model/src/repositories/routed-action-execution-envelope-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/routed-action-execution-envelope-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/repository-error.ts`
- `packages/domain-model/src/storage/routed-action-execution-envelope-relational-slice.ts`
- `packages/domain-model/src/storage/routed-action-execution-envelope-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/test/routed-action-execution-envelope-relational-repository-adapter-contracts.test.ts`
- `docs/architecture/adr/ADR-052-routed-action-execution-envelope-relational-adapter-contract.md`

## Boundary model
Direction:
- service -> repository -> relational adapter -> physical relational storage

Rules:
1. `ResearchService` continues to own routed-action execution-envelope write semantics
2. the relational repository remains domain-facing
3. the adapter operates on durable execution-envelope records and persistence-boundary reference validation
4. physical table layout stays behind the durable-record and error contracts

## Adapter operation contract
Adapter operations:
- `loadRoutedActionExecutionEnvelopeRecord`
- `listRoutedActionExecutionEnvelopeRecordsBySourceReviewDecisionId`
- `insertRoutedActionExecutionEnvelopeRecord`

Repository mapping:
- repository `getById` -> adapter `load`
- repository `listByReviewDecisionId` -> adapter `listBySourceReviewDecisionId`
- repository `create` -> repository dehydrates one durable record, then adapter `insert`

No update operation is defined in this step because the current routed-action-execution-envelope repository is create-only.

## Deterministic persistence-error mapping
Deterministic adapter error codes for the routed-action execution-envelope slice:
- `already_exists`
- `invalid_reference`

Retryable adapter error codes:
- `transient_failure`
- `unknown_failure`

Expected physical-to-contract mapping:
- unique/primary key conflict on create -> `already_exists`
- missing referenced `research_review_decision` -> `invalid_reference`
- connection interruption, lock timeout, deadlock, serialization retry class -> `transient_failure`
- uncategorized persistence failure -> `unknown_failure`

## Reference validation scope
This adapter contract expects:
- required referenced `research_review_decision` existence when `sourceReviewDecisionId` is populated

This contract intentionally does not attempt to validate:
- `sourceRoutingResultId`
- target refs inside `targetEntityRefs`

Those remain service-owned/query-owned references rather than durable entity FKs in this step.

## Explicitly postponed
- domain/durable mappers, adapter-backed relational repository implementation, and concrete Prisma adapter wiring are completed later in `docs/project/routed-action-execution-envelope-relational-rollout-model.md`
- shared implemented-product relational bundle extension through `routed_action_execution_envelope`
- opt-in real-Postgres integration coverage through `routed_action_execution_envelope`
- runtime review/execution engines
