# Current Phase

## Phase
**Phase 1.13 — Codex-first workflow, bounded autonomous mode, core-chain durable relational parity, and feedback-decision contract coverage**

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
- extend durable relational persistence through setup/research and signal/evaluation entities,
- extend logical durable relational contract coverage into the first downstream review entity,
- and run concrete Prisma-backed adapters and integration harnesses while keeping runtime engines pending.

## Implemented in this phase (current baseline)
- Codex-first workflow for planning, implementation, and repo coordination
- bounded autonomous mode policy with explicit step-by-step execution flow:
  - `docs/project/autonomous-mode-policy.md`
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
- second durable relational slice for signal/evaluation:
  - `docs/project/signal-evaluation-relational-rollout-model.md`
  - `docs/architecture/adr/ADR-030-signal-evaluation-durable-relational-rollout.md`
  - `packages/domain-model/src/storage/signal-evaluation-relational-slice.ts`
  - `packages/domain-model/src/storage/signal-evaluation-relational-physical-schema.ts`
  - `packages/domain-model/prisma/migrations/20260522101500_product_domain_signal_evaluation_relational_v1/migration.sql`
  - `packages/domain-model/src/repositories/signal-evaluation-relational-repository-adapter.ts`
  - `packages/domain-model/src/repositories/signal-evaluation-relational-repository-adapter.impl.ts`
  - `packages/domain-model/src/repositories/signal-evaluation-relational-repository-mappers.ts`
  - `packages/domain-model/src/repositories/signal-candidate-relational-repository.impl.ts`
  - `packages/domain-model/src/repositories/evaluation-result-relational-repository.impl.ts`
  - `packages/domain-model/src/repositories/signal-evaluation-relational-repositories.ts`
  - `packages/domain-model/src/repositories/signal-evaluation-relational-prisma-adapter.ts`
  - `packages/domain-model/src/repositories/signal-evaluation-relational-prisma-client.ts`
- setup-aggregate durable relational contract and physical schema:
  - `docs/project/setup-aggregate-relational-persistence-model.md`
  - `docs/architecture/adr/ADR-031-setup-aggregate-durable-relational-contract-and-schema.md`
  - `packages/domain-model/src/storage/setup-aggregate-relational-slice.ts`
  - `packages/domain-model/src/storage/setup-aggregate-relational-physical-schema.ts`
  - `packages/domain-model/prisma/migrations/20260522153000_product_domain_setup_aggregate_relational_v1/migration.sql`
- setup-aggregate adapter-backed relational repository and Prisma adapter:
  - `docs/project/setup-aggregate-relational-rollout-model.md`
  - `docs/architecture/adr/ADR-032-setup-aggregate-adapter-backed-relational-repositories.md`
  - `packages/domain-model/src/repositories/setup-aggregate-relational-repository-adapter.ts`
  - `packages/domain-model/src/repositories/setup-aggregate-relational-repository-adapter.impl.ts`
  - `packages/domain-model/src/repositories/setup-aggregate-relational-repository-mappers.ts`
  - `packages/domain-model/src/repositories/setup-aggregate-result-relational-repository.impl.ts`
  - `packages/domain-model/src/repositories/setup-aggregate-relational-repositories.ts`
  - `packages/domain-model/src/repositories/setup-aggregate-relational-prisma-adapter.ts`
  - `packages/domain-model/src/repositories/setup-aggregate-relational-prisma-client.ts`
- shared Prisma-backed composition for the implemented product chain:
  - `docs/project/implemented-product-relational-composition-model.md`
  - `docs/architecture/adr/ADR-033-shared-implemented-product-relational-composition.md`
  - `packages/domain-model/src/repositories/implemented-product-relational-repositories.ts`
  - `packages/domain-model/src/repositories/implemented-product-relational-prisma-client.ts`
- research-feedback-decision durable relational contract:
  - `docs/project/research-feedback-decision-relational-persistence-model.md`
  - `docs/architecture/adr/ADR-034-research-feedback-decision-durable-relational-contract.md`
  - `packages/domain-model/src/storage/research-feedback-decision-relational-slice.ts`
- implemented in-memory persistence and service-owned write paths for:
  - `SetupDefinition`
  - `ResearchHypothesis`
  - `SignalCandidate`
  - `EvaluationResult`
  - `SetupAggregateResult`
  - `ResearchFeedbackDecision`
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
- define the Prisma physical schema and migration layout for `research_feedback_decision`

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

It is the **foundation plus implemented in-memory persistence, bounded autonomous execution policy, three verified durable relational slices, shared core-chain composition, and one downstream feedback-decision storage contract that make the next review/governance persistence step straightforward instead of speculative**.
