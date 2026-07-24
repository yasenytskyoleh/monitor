# Review Decision Routing Result Relational Adapter Model

## Purpose
Define the repository-adapter contract for `review_decision_routing_result` after its durable contract and physical schema.

## Contract sources
- `packages/domain-model/src/repositories/review-decision-routing-result-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/review-decision-routing-result-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/repository-error.ts`
- `packages/domain-model/src/storage/review-decision-routing-result-relational-slice.ts`
- `packages/domain-model/test/review-decision-routing-result-relational-repository-adapter-contracts.test.ts`
- `docs/architecture/adr/ADR-082-review-decision-routing-result-relational-adapter-contract.md`

## Boundary model
Direction: service -> repository -> relational adapter -> physical relational storage.

The adapter operates only on durable routing-result records. Routing policy and write orchestration remain service-owned, while the adapter owns the physical source review-decision reference check.

## Operations
- `loadReviewDecisionRoutingResultRecord`
- `listReviewDecisionRoutingResultRecordsByResearchReviewDecisionId`
- `insertReviewDecisionRoutingResultRecord`

Repository mapping:
- `getById` -> `load`
- `listByReviewDecisionId` -> `listByResearchReviewDecisionId`
- `create` -> dehydrate one record, then `insert`

No update operation is defined because the current repository is create-only.

## Error and reference rules
Deterministic errors: `already_exists`, `invalid_reference`.

Retryable errors: `transient_failure`, `unknown_failure`.

The adapter must validate the required `research_review_decision` reference on insert. The setup family and optional revision retain service-owned lineage semantics because the physical schema does not declare foreign keys for them.

## Explicitly postponed
- domain/durable mappers, adapter-backed repository, and concrete Prisma adapter
- shared implemented-product composition is completed later in `docs/project/implemented-product-review-decision-routing-result-composition-model.md`
- real-Postgres integration is completed later in `docs/project/implemented-product-review-decision-routing-result-integration-model.md`
- routing-service write-path changes
