# Current Phase

## Phase
**Phase 1 — Agent operating system / orchestration foundation**

## What this phase is about
Phase 1 is focused on proving that the project can:
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
- live-capable non-implementation chain:
  - Product Agent
  - Architect Agent
  - Quant Pattern Agent
  - Docs Reviewer Agent
- Backend Agent remains mocked
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
- standardized shared live-adapter pipeline for all current live agents

## What this phase is not
Phase 1 is **not** about building a full crypto trading platform.

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

Phase 1 is therefore not a distraction from the real product.

It is the **foundation that makes the real product possible**.
