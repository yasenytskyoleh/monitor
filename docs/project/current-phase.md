# Current Phase

## Phase
**Phase 1.8 — Orchestration foundation plus first monitoring/evaluation/aggregation contracts**

## What this phase is about
This phase is focused on:
- keeping the orchestration foundation stable and constrained, and
- defining the first explicit product-domain contracts for monitoring/research.

The orchestration side proves that the project can:
- define agent roles clearly,
- validate configs and schemas,
- orchestrate state-based workflows,
- run mocked and selective live agents,
- persist workflow artifacts,
- maintain safety and traceability.

## Implemented in this phase (current baseline)
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

## Why this phase matters
Even though the larger vision is market-facing, the current orchestration focus is still correct.

Without a stable operating system for:
- agents,
- workflows,
- contracts,
- approvals,
- and artifacts,

the future market and signal layers would become chaotic very quickly.

This phase is therefore not a distraction from the real product.

It is the **foundation plus first product-domain contracts that make the real product implementable**.
