# Research Decision Approval Relational Adapter Model

## Purpose
Define the repository-adapter rollout contract for `research_decision_approval`.

This step formalizes:
- repository-to-adapter boundaries
- deterministic persistence-error mapping
- reference validation responsibilities

for the approval slice with committed physical schema artifacts but without repository mappers or concrete Prisma adapter wiring.

## Contract sources
- `packages/domain-model/src/repositories/research-decision-approval-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/research-decision-approval-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/repository-error.ts`
- `packages/domain-model/src/storage/research-decision-approval-relational-slice.ts`
- `packages/domain-model/src/storage/research-decision-approval-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/test/research-decision-approval-relational-repository-adapter-contracts.test.ts`
- `docs/architecture/adr/ADR-040-research-decision-approval-relational-adapter-contract.md`

## Boundary model
Direction:
- service -> repository -> relational adapter -> physical relational storage

Rules:
1. `ResearchService` continues to own approval write semantics
2. the future relational repository remains domain-facing
3. the adapter operates on durable approval records and reference validation at the persistence boundary
4. physical table layout stays behind the durable-record and error contracts

## Adapter operation contract
Adapter operations:
- `loadResearchDecisionApprovalRecord`
- `listResearchDecisionApprovalRecordsByResearchFeedbackDecisionId`
- `insertResearchDecisionApprovalRecord`

Repository mapping:
- repository `getById` -> adapter `load`
- repository `listByFeedbackDecisionId` -> adapter `list`
- repository `create` -> repository dehydrates one durable record, then adapter `insert`

No update operation is defined in this step because the current approval repository is create-only.

## Deterministic persistence-error mapping
Deterministic adapter error codes for the approval slice:
- `already_exists`
- `invalid_reference`

Retryable adapter error codes:
- `transient_failure`
- `unknown_failure`

Expected physical-to-contract mapping:
- unique/primary key conflict on create -> `already_exists`
- missing referenced `research_feedback_decision` -> `invalid_reference`
- missing referenced `setup_definition` -> `invalid_reference`
- referenced feedback-decision/setup mismatch -> `invalid_reference`
- connection interruption, lock timeout, deadlock, serialization retry class -> `transient_failure`
- uncategorized persistence failure -> `unknown_failure`

## Reference validation scope
This adapter contract expects:
- `research_feedback_decision` existence
- `setup_definition` existence
- consistency between the referenced feedback decision and the approval record's `setupDefinitionId`

This keeps the repository boundary aligned with the existing service-owned approval flow while the concrete Prisma adapter is still pending.

## Explicitly postponed
- domain/durable mappers for approvals
- adapter-backed relational repository implementation
- concrete Prisma adapter wiring
- shared implemented-product bundle extension through approvals
- runtime review/execution engines
