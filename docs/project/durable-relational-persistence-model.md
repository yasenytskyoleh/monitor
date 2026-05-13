# Durable Relational Persistence Model

## Purpose
Define the first durable relational persistence contract for Monitor product-domain entities.

This step formalizes:
- logical durable record contracts,
- versioning semantics,
- mapping rules,
- and adapter failure boundaries

for the first durable slice before runtime DB adapter code is introduced.

## First durable slice scope
- `SetupDefinition`
- `ResearchHypothesis`
- explicit `ResearchHypothesis <-> SetupDefinition` linkage

This slice is anchored to existing implemented in-memory persistence and preserves current service-owned write paths.

## Contract source
- `packages/domain-model/src/storage/first-durable-relational-slice.ts`
- `packages/domain-model/prisma/schema.prisma`
- `docs/project/relational-adapter-rollout-model.md`

## Logical durable record contracts

### SetupDefinition durable record
Logical contract fields:
- `storageSchemaVersion`
- `identity.boundary = product_domain`
- `identity.entityType = setup_definition`
- `identity.entityId = SetupDefinition.id`
- `identity.version` as optimistic concurrency version
- `lifecycleStatus`
- `createdAtUtc`
- `updatedAtUtc`
- `archivedAtUtc`
- `metadata`
- `definitionStatus`
- `name`
- `description`
- `measurableConditions`
- `evaluationAssumptions`
- `invalidationAssumptions`
- `traceMetadata`

### ResearchHypothesis durable record
Logical contract fields:
- `storageSchemaVersion`
- `identity.boundary = product_domain`
- `identity.entityType = research_hypothesis`
- `identity.entityId = ResearchHypothesis.id`
- `identity.version` as optimistic concurrency version
- `lifecycleStatus`
- `createdAtUtc`
- `updatedAtUtc`
- `archivedAtUtc`
- `metadata`
- `hypothesisStatus`
- `title`
- `description`
- `assumptions`
- `notes`
- `evidenceStatus`
- `evidenceSummary`
- `lastEvidenceAggregateResultId`
- `lastEvidenceAssessedAt`

### Explicit linkage contract
`ResearchHypothesisSetupDefinitionLinkRecord` is the durable linkage contract between:
- one `research_hypothesis`
- one `setup_definition`

Rules:
- duplicate links are forbidden
- missing target `setup_definition` blocks write
- link records are part of `ResearchHypothesis` durability, not orchestration evidence
- physical storage may use join table(s) as long as the logical contract is preserved

## Mapping rules
1. repositories continue to return domain-shaped records, not durable record contracts
2. durable record contracts are logical persistence contracts; physical relational layout may normalize linkage-heavy fields
3. `ProductRecordMetadata` remains attached to durable product records and is not replaced by orchestration artifacts
4. `originRunId`, `originTransitionId`, and `traceId` remain metadata/trace fields only
5. `relatedSetupDefinitionIds` ordering is not semantically significant; uniqueness is required

## Versioning and write semantics
- `storageSchemaVersion` is fixed to `product_domain.relational.v1` for this slice
- create starts `identity.version` at `1`
- every successful update or status transition increments `identity.version` by `1`
- repository `expectedVersion` maps to current stored `identity.version`
- `ResearchHypothesis` row changes and hypothesis-to-setup link changes must commit atomically within the repository boundary

## Deterministic repository failure expectations
- duplicate create -> `already exists`
- missing entity on update/status write -> `not found`
- stale `expectedVersion` -> `version mismatch`
- invalid setup linkage for `ResearchHypothesis` -> write rejected before persistence

These errors should remain deterministic across in-memory and future relational repository implementations.

## Compatibility guidance
- future schema changes should prefer additive evolution before destructive rewrites
- any future schema-version bump must preserve adapter compatibility or include explicit backfill planning
- historical stored `identity.version` values must not be rewritten retroactively during ordinary application writes

## Explicitly postponed
- Prisma client/runtime wiring
- relational repository runtime adapters
- query/index tuning
- expansion of durable relational planning to `signal_candidate`, `evaluation_result`, and `setup_aggregate_result`
- runtime ingestion/detection/evaluation/aggregation engines
- UI
