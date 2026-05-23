# Research Decision Approval Relational Persistence Model

## Purpose
Define the durable relational contract for `ResearchDecisionApproval` before physical schema or adapter implementation.

This keeps the next downstream approval persistence slice narrow:
- logical durable record contract
- reference and nullability rules
- create/version semantics
- deterministic repository failure expectations

without yet introducing:
- Prisma schema or SQL migration artifacts
- repository mappers
- in-memory durable adapters
- concrete Prisma adapters

## Implemented artifact locations
- `packages/domain-model/src/storage/research-decision-approval-relational-slice.ts`
- `packages/domain-model/test/durable-relational-storage-contracts.test.ts`
- `docs/architecture/adr/ADR-038-research-decision-approval-durable-relational-contract.md`

## Durable record shape
`ResearchDecisionApprovalDurableRecord` keeps:
- standard `product_domain` durable identity, lifecycle, metadata, and schema version fields
- `approvalStatus`
- `researchFeedbackDecisionId`
- `setupDefinitionId`
- `reviewedBy`
- `reviewedAtUtc`
- `approvalOutcome`
- nullable `reviewerNotes`
- nullable `authorizedNextAction`

Optional domain fields are normalized to nullable durable fields rather than omitted storage keys.

## Reference and mapping rules
- `researchFeedbackDecisionId` is required and must refer to the feedback decision approved by the current research review flow
- `setupDefinitionId` is required and must remain consistent with the setup attached to the referenced feedback decision
- `reviewedBy` and `reviewedAtUtc` remain explicit durable fields because the approval artifact is reviewer-authored rather than runtime-derived
- `reviewerNotes` is nullable and keeps the existing domain meaning without forcing a separate notes table
- `authorizedNextAction` is nullable and should be present only for outcomes that authorize a downstream action
- `createdAt` and `updatedAt` map directly to durable timestamps
- `ProductRecordMetadata` remains attached to the durable product record and is not replaced by orchestration evidence artifacts

## Versioning and write semantics
- `storageSchemaVersion` remains `product_domain.relational.v1`
- create starts at `identity.version = 1`
- the current approval repository is create-only, so this step defines immutable create semantics rather than an update lifecycle
- if a later controlled update path is introduced, it must use the same optimistic version boundary as the other durable product entities

## Deterministic repository failure expectations
- duplicate create -> `already exists`
- invalid `research_feedback_decision` reference -> rejected before persistence
- invalid `setup_definition` reference -> rejected before persistence
- mismatched feedback-decision / setup linkage -> rejected before persistence
- missing reads remain `null` / empty-list semantics at the repository boundary

## What remains pending
- physical Prisma schema and SQL migration layout for `research_decision_approval`
- adapter-backed repository and concrete Prisma adapter wiring
- later review/execution durable slices
