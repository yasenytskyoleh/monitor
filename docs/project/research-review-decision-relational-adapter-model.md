# Research Review Decision Relational Adapter Model

## Purpose
Define the repository-adapter rollout contract for `research_review_decision`.

This step formalizes:
- repository-to-adapter boundaries
- deterministic persistence-error mapping
- reference validation responsibilities

for the review-decision slice with committed physical schema artifacts but without yet extending the shared implemented-product bundle through review decisions.

## Contract sources
- `packages/domain-model/src/repositories/research-review-decision-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/research-review-decision-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/repository-error.ts`
- `packages/domain-model/src/storage/research-review-decision-relational-slice.ts`
- `packages/domain-model/src/storage/research-review-decision-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/test/research-review-decision-relational-repository-adapter-contracts.test.ts`
- `docs/architecture/adr/ADR-046-research-review-decision-relational-adapter-contract.md`

## Boundary model
Direction:
- service -> repository -> relational adapter -> physical relational storage

Rules:
1. `ResearchService` continues to own review-decision write semantics
2. the relational repository remains domain-facing
3. the adapter operates on durable review-decision records and persistence-boundary reference validation
4. physical table layout stays behind the durable-record and error contracts

## Adapter operation contract
Adapter operations:
- `loadResearchReviewDecisionRecord`
- `listResearchReviewDecisionRecordsByReviewPacketId`
- `listResearchReviewDecisionRecordsBySetupFamilyId`
- `insertResearchReviewDecisionRecord`

Repository mapping:
- repository `getById` -> adapter `load`
- repository `listByReviewPacketId` -> adapter `list`
- repository `listBySetupFamilyId` -> adapter `list`
- repository `create` -> repository dehydrates one durable record, then adapter `insert`

No update operation is defined in this step because the current review-decision repository is create-only.

## Deterministic persistence-error mapping
Deterministic adapter error codes for the review-decision slice:
- `already_exists`
- `invalid_reference`

Retryable adapter error codes:
- `transient_failure`
- `unknown_failure`

Expected physical-to-contract mapping:
- unique/primary key conflict on create -> `already_exists`
- missing referenced `research_hypothesis` when `researchHypothesisId` is present -> `invalid_reference`
- connection interruption, lock timeout, deadlock, serialization retry class -> `transient_failure`
- uncategorized persistence failure -> `unknown_failure`

## Reference validation scope
This adapter contract expects:
- optional `research_hypothesis` existence when `researchHypothesisId` is populated

This contract intentionally does not attempt to validate:
- `research_review_packet_id`
- `setup_family_id`
- `setup_revision_id`

Those remain service-owned/query-owned references rather than durable entity FKs in this step.

## Explicitly postponed
- domain/durable mappers for review decisions
- adapter-backed relational repository implementation
- concrete Prisma adapter wiring
- shared implemented-product bundle extension through review decisions
- runtime review/execution engines
