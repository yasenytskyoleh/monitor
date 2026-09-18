# Decisions Log

## Core product and scope decisions
- Monitor is an **agent-assisted crypto monitoring and research platform**
- Phase 1 established the orchestration foundation, not a trading platform
- after backend safety hardening, the next strategic move is **product-domain definition before more backend power**
- current market scope is **spot only**
- news enrichment should come **after** signal/statistics foundation
- the project uses a **monorepo from the start**
- day-to-day repo work runs through a **Codex-first workflow**
- the internal orchestrator remains a **constrained supporting subsystem** in the repo

## Architectural decisions
- docs are the human-readable contract layer
- YAML configs are the editable operational layer
- JSON Schemas are the machine-validation layer
- runtime code must enforce rules rather than relying on prompts alone
- the system should be **fail-closed by default**
- approval-gated transitions must not be bypassed
- persisted workflow artifacts are part of the platform foundation
- live agents should be introduced **incrementally**, one by one
- orchestration-domain and product-domain concerns must be separated explicitly
- first product-domain contracts live in a dedicated package (`packages/domain-model`)
- monitoring ingestion is contract-first with normalized events before setup-detection logic
- evaluation is contract-first with explicit window/status/metrics before statistics/scoring
- research evidence is contract-first with explicit aggregation scopes and setup comparison before ranking
- persistence is contract-first with explicit storage boundaries before DB/repository implementation
- repository/service architecture is contract-first before schema and runtime persistence code
- implemented in-memory persistence exists before durable relational persistence
- first durable relational persistence contract exists before DB migration work
- first relational adapter rollout design exists before Prisma implementation work
- first physical Prisma schema and migration layout exists before runtime adapter wiring
- adapter-backed relational repositories exist before concrete Prisma adapter wiring
- operational scheduling state belongs in a separate `runtime_control` schema, never in `product_domain`
- a service response is not automatically a durable record: `routed_action_execution_result` is
  classified product-ephemeral, with `execution_attempt_audit` as the dedicated retained audit entity
- user-facing alerts are **at-most-once**: an ambiguous delivery is terminalized as failed, never
  retried or resent
- job cadence is owned externally (launchd/systemd/cron), not by an in-repo scheduler daemon
- bounded jobs take durable, owner-fenced leases so concurrent invocations skip instead of duplicating

## Agent/workflow decisions
- current core agents:
  - Product Agent
  - Architect Agent
  - Backend Agent
  - Quant Pattern Agent
  - Docs Reviewer Agent
- current main workflow:
  `INTAKE -> DESIGN -> FORMALIZE -> IMPLEMENT -> REVIEW -> APPROVAL -> PUBLISH_SIGNAL -> DONE`
- invalid transitions must fail
- missing approvals should lead to controlled rejection
- no silent downgrade from live to mock

## Progress decisions already realized

> This section used to restate every shipped slice and went stale. Current status lives in
> `docs/project/current-phase.md`; the decision trail lives in `docs/architecture/adr/`
> (ADR-001 … ADR-104). Only genuinely decision-shaped milestones are kept here.

- the orchestration foundation shipped first and remains constrained
- product-domain contracts were defined before any runtime engine was built
- in-memory persistence landed before durable relational persistence, per entity
- durable relational persistence completed for all 18 product entities via the fixed 6-step rollout
- one shared Prisma bundle and one real-Postgres integration flow span that chain
- the human-in-the-loop review and execution chain shipped before any automated action
- public Binance Spot BTC/USDT ingestion, detection, evaluation and aggregation shipped as the
  first real-data loop
- evidence-gated, at-most-once decision-support delivery shipped with Telegram as the only adapter
- durable cross-process run ownership shipped before any external cadence was enabled

## Current next-step decision
- the currently recommended next step is: **validate and explicitly enable the external BTC
  evaluation cadence**, matching `docs/project/next-steps.md`
- the previous entry here ("define a provider-specific downstream executor and its authorization
  and retry policy") is **superseded**: those executors shipped, and provider retries are now
  explicitly out of scope
