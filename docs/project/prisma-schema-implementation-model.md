# Prisma Schema Implementation Model

## Purpose
Define the first physical Prisma schema and initial SQL migration for Monitor product-domain durability.

This step adds committed physical storage artifacts for the first durable slice without yet wiring:
- Prisma client/tooling into package scripts,
- relational repository adapters,
- or a live DB runtime.

## Implemented artifact locations
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260512235500_product_domain_relational_v1_init/migration.sql`
- `packages/domain-model/src/storage/first-durable-relational-physical-schema.ts`

## Physical slice scope
- `SetupDefinition`
- `ResearchHypothesis`
- explicit `ResearchHypothesis <-> SetupDefinition` linkage

## Physical layout
Database schema:
- `product_domain`

Tables:
- `setup_definition`
- `research_hypothesis`
- `research_hypothesis_setup_definition_link`

Enum families:
- `persisted_lifecycle_status`
- `product_record_source`
- `setup_definition_status`
- `research_hypothesis_status`
- `hypothesis_evidence_status`

## Mapping rules

### SetupDefinition
- `identity.entityId` -> `setup_definition.setup_definition_id`
- `identity.version` -> `setup_definition.version`
- `traceMetadata` is flattened into:
  - `trace_origin_run_id`
  - `trace_origin_transition_id`
  - `trace_metadata_trace_id`
- `ProductRecordMetadata` remains explicit columns, not JSON

### ResearchHypothesis
- `identity.entityId` -> `research_hypothesis.research_hypothesis_id`
- `identity.version` -> `research_hypothesis.version`
- `relatedSetupDefinitionIds` are normalized into `research_hypothesis_setup_definition_link`
- link rows, not an array column, are the physical source of truth for setup linkage

## Constraints and indexes
Implemented physical constraints:
- `version > 0` for both primary tables
- non-empty `measurable_conditions`
- non-empty `assumptions`
- `updated_at_utc >= created_at_utc`
- `archived_at_utc` must match `lifecycle_status`
- composite primary key on hypothesis/setup link table
- foreign keys from link rows to both primary tables

Implemented indexes:
- `idx_setup_definition_definition_status`
- `idx_setup_definition_lifecycle_status`
- `idx_research_hypothesis_hypothesis_status`
- `idx_research_hypothesis_lifecycle_status`
- `idx_research_hypothesis_setup_definition_link_setup_definition_id`

## What remains pending
- Prisma package/tooling wiring for executable validation and client generation
- relational repositories/adapters against this schema
- error translation from physical DB failures into repository contract errors
- parity tests against the in-memory repository baseline
- runtime DB configuration and deployment concerns
