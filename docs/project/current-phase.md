# Current Phase

## Phase
**Phase 1.10 — Codex-first workflow, internal orchestration foundation, implemented in-memory persistence, and first physical relational schema artifacts**

## What this phase is about
This phase is focused on:
- using a Codex-first workflow for day-to-day repo work,
- keeping the orchestration foundation stable and constrained, and
- defining and extending explicit product-domain contracts for monitoring/research.

The orchestration side proves that the project can:
- define agent roles clearly,
- validate configs and schemas,
- orchestrate state-based workflows,
- run mocked and selective live agents,
- persist workflow artifacts,
- maintain safety and traceability.

The product side now proves that the repo can:
- maintain implemented in-memory persistence,
- enforce service-owned write paths,
- define first durable relational persistence and adapter contracts,
- and commit first physical Prisma schema artifacts while keeping DB runtime adapters pending.

## Implemented in this phase (current baseline)
- Codex-first workflow for planning, implementation, and repo coordination
- config-driven orchestration foundation (`docs/agents`, `configs/agents`, `packages/agent-config`)
- compiled immutable runtime snapshots with checksum and version metadata
- runner execution modes:
  - `mock` (deterministic scenarios)
  - `live` (OpenAI-backed where implemented)
  - per-agent overrides via `--agent-mode`
- live-capable agent chain:
  - Product Agent
  - Architect Agent
  - Quant Pattern Agent
  - Backend Agent (constrained patch mode)
  - Docs Reviewer Agent
- strict transition guardrails:
  - allowlisted transitions only
  - approval-gated edges enforced
  - missing/invalid/expired/revoked approvals blocked
  - transition-to-approval binding validated
- strict artifact enforcement:
  - explicit artifact registry per run
  - role-to-artifact allowlists
  - required artifact checks before advancement
  - reference continuity checks
- persisted run evidence:
  - `run.json`
  - `transitions.json`
  - `terminal-outcome.json`
  - `artifacts.json`
  - `approvals.json`
- backend constrained implementation safety (current baseline):
  - isolated apply + verification in temp workspace
  - rollback plan/result persistence
  - controlled promotion to main workspace (`promote_verified`)
  - narrow helper-file creation constraints (including json helper fixtures)
  - dedicated stability reassessment artifact for audit runs (`stability-reassessment.json`)
- standardized shared live-adapter pipeline for all current live agents
- first product-domain slice contracts (no runtime engines yet):
  - `packages/domain-model`
  - `docs/project/domain-model.md`
  - `docs/project/research-model.md`
  - `docs/architecture/adr/ADR-001-first-product-domain-slice.md`
- first monitoring-ingestion architecture contracts (still no runtime ingestion):
  - `docs/project/monitoring-model.md`
  - `docs/project/normalized-events.md`
  - `docs/architecture/adr/ADR-002-market-monitoring-ingestion-architecture.md`
  - `packages/domain-model/src/monitoring/*`
- first evaluation/outcome architecture contracts (still no runtime evaluation engine):
  - `docs/project/evaluation-model.md`
  - `docs/project/outcome-metrics.md`
  - `docs/architecture/adr/ADR-003-signal-evaluation-outcome-model.md`
  - `packages/domain-model/src/evaluation/*`
- first research-aggregation/comparison contracts (still no runtime analytics engine):
  - `docs/project/research-aggregation-model.md`
  - `docs/project/setup-comparison-model.md`
  - `docs/architecture/adr/ADR-004-evaluation-aggregation-and-research-model.md`
  - `packages/domain-model/src/research/*`
- first persistence/storage architecture contracts (durable relational persistence pending):
  - `docs/project/storage-architecture.md`
  - `docs/project/persistence-boundaries.md`
  - `docs/architecture/adr/ADR-005-product-domain-storage-architecture.md`
  - `packages/domain-model/src/storage/*`
- first durable relational persistence contract for the first durable slice:
  - `docs/project/durable-relational-persistence-model.md`
  - `docs/architecture/adr/ADR-026-first-durable-relational-persistence-contract.md`
  - `packages/domain-model/src/storage/first-durable-relational-slice.ts`
- first relational adapter rollout design for the first durable slice:
  - `docs/project/relational-adapter-rollout-model.md`
  - `docs/architecture/adr/ADR-027-first-relational-adapter-rollout-design.md`
  - `packages/domain-model/src/repositories/first-durable-relational-repository-adapter.ts`
  - `packages/domain-model/src/repositories/repository-error.ts`
- first physical Prisma schema and initial migration for the first durable slice:
  - `docs/project/prisma-schema-implementation-model.md`
  - `docs/architecture/adr/ADR-028-first-prisma-schema-and-migration-layout.md`
  - `packages/domain-model/src/storage/first-durable-relational-physical-schema.ts`
  - `packages/domain-model/prisma/schema.prisma`
  - `packages/domain-model/prisma/migrations/20260512235500_product_domain_relational_v1_init/migration.sql`
- first adapter-backed relational repositories for the first durable slice:
  - `docs/project/relational-repository-implementation-model.md`
  - `docs/architecture/adr/ADR-029-first-adapter-backed-relational-repositories.md`
  - `packages/domain-model/src/repositories/first-durable-relational-repository-mappers.ts`
  - `packages/domain-model/src/repositories/first-durable-relational-repository-adapter.impl.ts`
  - `packages/domain-model/src/repositories/setup-definition-relational-repository.impl.ts`
  - `packages/domain-model/src/repositories/research-hypothesis-relational-repository.impl.ts`
- implemented in-memory persistence and service-owned write paths for:
  - `SetupDefinition`
  - `ResearchHypothesis`
  - `SignalCandidate`
  - `EvaluationResult`
  - `SetupAggregateResult`
- repository/service implementation architecture with durable relational persistence pending:
  - `docs/project/persistence-implementation-architecture.md`
  - `docs/project/first-persisted-slice.md`
  - `docs/architecture/adr/ADR-006-product-domain-repository-and-service-architecture.md`
  - `packages/domain-model/src/repositories/*`
  - `packages/domain-model/src/services/*`

## What this phase is not
This phase is **not** about building a full crypto trading platform.

Explicitly out of scope:
- automated trading execution,
- futures / leverage / funding-rate logic,
- liquidation logic,
- news enrichment,
- sentiment scoring,
- discretionary AI-generated trade decisions,
- full market data ingestion,
- production signal engine.

## Market scope
- **spot only**

This scope was chosen to keep the domain simple while the orchestration layer is being built.

## Current recommended next step
- shared repository composition and real-database integration for the first durable slice, starting with `setup_definition` and `research_hypothesis`

## Why this phase matters
Even though the larger vision is market-facing, the current Codex-first workflow plus constrained automation focus is still correct.

Without a stable operating system for:
- agents,
- workflows,
- contracts,
- approvals,
- and artifacts,

the future market and signal layers would become chaotic very quickly.

This phase is therefore not a distraction from the real product.

It is the **foundation plus implemented in-memory persistence, first physical schema artifacts, adapter-backed relational repositories, and now real Prisma client/adapter wiring that make the real product implementable while shared repository composition and live database integration remain the next-step work**.
