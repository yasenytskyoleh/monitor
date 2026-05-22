# Signal/Evaluation Relational Rollout Model

## Purpose
Define the second executable durable relational slice for:
- `SignalCandidate`
- `EvaluationResult`

This step extends the already-proven relational pattern from:
- `SetupDefinition`
- `ResearchHypothesis`

without expanding into runtime market ingestion, detection engines, evaluation jobs, or aggregation execution.

## Implemented artifact locations
- `packages/domain-model/src/storage/signal-evaluation-relational-slice.ts`
- `packages/domain-model/src/storage/signal-evaluation-relational-physical-schema.ts`
- `packages/domain-model/prisma/schema.prisma`
- `packages/domain-model/prisma/migrations/20260522101500_product_domain_signal_evaluation_relational_v1/migration.sql`
- `packages/domain-model/src/repositories/signal-evaluation-relational-repository-adapter.ts`
- `packages/domain-model/src/repositories/signal-evaluation-relational-repository-adapter.impl.ts`
- `packages/domain-model/src/repositories/signal-evaluation-relational-repository-mappers.ts`
- `packages/domain-model/src/repositories/signal-candidate-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/evaluation-result-relational-repository.impl.ts`
- `packages/domain-model/src/repositories/signal-evaluation-relational-repositories.ts`
- `packages/domain-model/src/repositories/signal-evaluation-relational-prisma-adapter.ts`
- `packages/domain-model/src/repositories/signal-evaluation-relational-prisma-client.ts`
- `packages/domain-model/test/signal-evaluation-relational-repository-adapter-contracts.test.ts`
- `packages/domain-model/test/signal-evaluation-relational-repository-mappers.test.ts`
- `packages/domain-model/test/signal-evaluation-relational-repositories.test.ts`
- `packages/domain-model/test/signal-evaluation-prisma-adapter.test.ts`
- `packages/domain-model/test/signal-evaluation-relational-repositories.integration.test.ts`

## Durable record design

### SignalCandidate
- durable identity is versioned and tied to `product_domain`
- physical FK is enforced only for `setup_definition`
- `setup_revision_id`, `monitored_symbol_id`, and optional `detection_hit_id` remain scalar references in this slice
- candidate status, detected timestamp, evidence summary, and optional candidate-origin run id are first-class durable fields

### EvaluationResult
- durable identity is versioned and tied to `product_domain`
- physical FK is enforced for `signal_candidate`
- `evaluation_window_id` remains a scalar reference in this slice
- completed metrics and `evaluated_at_utc` are durable nullable fields with DB-level completion consistency checks
- uniqueness is enforced for `(signal_candidate_id, evaluation_window_id)`

## Adapter and repository behavior
- repositories continue to own domain-to-durable hydration/dehydration
- adapters continue to own physical persistence behavior and deterministic error mapping
- in-memory durable adapters remain validation harnesses only; they are not durable product storage
- Prisma adapters now exist for both the first durable slice and this signal/evaluation slice
- shared-client integration coverage now proves that setup, candidate, and evaluation persistence can run together against the committed migrations

## What this step proves
- the durable relational rollout pattern is reusable beyond the initial setup/research slice
- scalar reference handling is sufficient for intermediate entities whose upstream/downstream relational tables are not all implemented yet
- shared Prisma-backed repository composition can support multi-entity persistence flows without mixing domain rules into adapters

## What remains pending
- broader multi-slice repository factory composition for all implemented durable entities
- runtime detection, evaluation, and aggregation engines
- exchange ingestion and UI work
