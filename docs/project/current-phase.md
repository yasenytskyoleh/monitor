# Current Phase

## Phase
**Phase 1.54 — External BTC job cadence preparation**

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
- extend per-entity durable parity through downstream feedback, approval, review, and execution-envelope entities,
- complete the first downstream mutation-audit durable repository rollout,
- extend the shared implemented-product bundle and one opt-in real-database integration path through that mutation-audit slice,
- define the first later downstream refinement-follow-up durable contract/schema slice as `setup_refinement_request`,
- complete the adapter-backed repository and concrete Prisma adapter for that slice,
- extend the shared implemented-product bundle through that slice,
- extend one opt-in real-database integration path through that slice,
- commit the next downstream revision-slice durable relational contract, Prisma schema, relational adapter contract, adapter-backed repository, and concrete Prisma adapter for `setup_definition_revision`,
- extend the shared implemented-product bundle through `setup_definition_revision`,
- extend one opt-in real-database integration path through `setup_definition_revision`,
- commit the next downstream activation-audit durable relational contract, Prisma schema, relational adapter contract, adapter-backed repository, and concrete Prisma adapter for `setup_revision_activation_record`,
- complete shared implemented-product activation-bundle composition,
- extend one opt-in real-database integration path through `setup_revision_activation_record`,
- complete the review-decision-routing-result durable relational contract, Prisma schema, adapter, shared-composition, and integration rollout,
- classify `routed_action_execution_result` as product-ephemeral rather than inferring a durable record from a service response,
- complete all current non-trading envelope executors while keeping scheduling and automated
  trading pending, and
- derive explainable BTC notification eligibility from fresh signal candidates and historical
  aggregate evidence, retain that immutable decision-support snapshot, record one
  provider-neutral delivery lifecycle through an explicit one-send, durable-lease workflow,
  dispatch bounded pending delivery work, and reconcile bounded unconfirmed work without retry or
  resend; Telegram is the explicit adapter, with no background scheduler, automatic retry,
  authenticated exchange writes, or trading.
- connect a caller-owned historical/live closed-candle feed to deterministic pattern detection
  without coupling the Binance adapter to product-domain handoffs or adding a background scheduler.
- package the BTC runtime as a non-root Node 24 image with migration, canonical seed, bounded
  real-data smoke, and long-running Compose workflows.
- prepare external five-minute evaluator cadence for macOS and Linux without enabling timers or
  scheduled Telegram delivery by default.

## Implemented in this phase (current baseline)

> A per-file inventory used to live here and was the single largest source of doc drift.
> It is gone on purpose. For file-level detail read the code and `docs/architecture/adr/`
> (ADR-001 through ADR-104); this section records only what is true, not where it lives.

### Orchestration foundation
- config + JSON-schema validation platform (`packages/agent-config`); compiled immutable runtime
  snapshots carrying checksum and version metadata
- workflow runner with `mock` and `live` modes plus per-agent overrides (`--agent-mode`)
- live-capable agent chain: Product, Architect, Quant Pattern, Backend (constrained patch mode),
  Docs Reviewer
- strict transition guardrails (allowlisted transitions, approval-gated edges, expiry and
  revocation checks, transition-to-approval binding)
- strict artifact enforcement (per-run registry, role allowlists, required-artifact checks,
  reference continuity)
- persisted run evidence: `run.json`, `transitions.json`, `terminal-outcome.json`,
  `artifacts.json`, `approvals.json`
- backend constrained implementation safety: isolated apply + verification in a temp workspace,
  rollback plan/result persistence, controlled promotion (`promote_verified`)
- bounded autonomous execution policy: `docs/project/autonomous-mode-policy.md`

### Product-domain persistence
- 18 durable product entities. Each has the full hexagonal family — durable relational contract,
  physical schema, adapter port, in-memory adapter, mappers, adapter-backed repository, Prisma
  adapter, slice composition — **except `pattern_notification`**, which has only a direct Prisma
  repository and is not in the shared bundle. That is the one known architectural gap.
- one shared Prisma-backed bundle (`createImplementedProductRelationalPrismaRepositories`) wiring
  15 adapters across 17 of the 18 entities
- one end-to-end opt-in real-Postgres integration flow across that bundle
- service-owned write paths (`PRODUCT_WRITE_PATH_OWNERSHIP`), optimistic concurrency via
  `expectedVersion` / `version`
- `routed_action_execution_result` is classified product-ephemeral; `execution_attempt_audit` is
  the dedicated retained audit entity
- operational scheduling state lives in a separate `runtime_control` schema, never in
  `product_domain`

### Market and research runtimes
- Binance Spot BTC/USDT public closed-candle adapter: REST backfill plus WebSocket live feed, gap
  and stale-stream detection, REST catch-up before buffered candles are released, no credentials
- deterministic closed-candle breakout detection producing traceable signal candidates
- bounded 24-hour closed-candle evaluation, aggregate refresh, and hypothesis-evidence updates
- the full human-in-the-loop review chain: feedback decision → manual approval → review packet →
  review decision → routing → routed-action preparation → audited execution attempt, dispatching
  to the activation, lifecycle, and refinement envelope executors
- explainable BTC notification eligibility derived from a fresh signal candidate plus compatible
  historical aggregate evidence, retained immutably under a deduplication key
- one provider-neutral delivery lifecycle: durable lease, at-most-once send, and no-resend
  reconciliation of unconfirmed attempts. Telegram is the only adapter and stays manual.
- durable cross-process ownership for bounded jobs (`runtime_control.scheduled_job_run`):
  120-second lease, 30-second heartbeat, owner-fenced renewal and terminal writes
- containerized runtime (non-root Node 24) with migration, canonical seed, bounded real-data
  smoke, and long-running Compose workflows
- external five-minute evaluator cadence prepared for macOS launchd and Linux systemd —
  **templates only; this repository installs neither**

### Known gaps carried into the next step
- `pattern_notification` bypasses the hexagonal pattern described above
- `review_decision_routing_result` is persisted but has no `PRODUCT_WRITE_PATH_OWNERSHIP` entry
- the review/execution chain has no composition root: 15 of 23 packages have no workspace consumer
  (deliberate contract-first sequencing, not dead code — see `next-steps.md`)

## What this phase is not
This phase is **not** about building a full crypto trading platform.

Explicitly out of scope:
- automated trading execution,
- futures / leverage / funding-rate logic,
- liquidation logic,
- news enrichment,
- sentiment scoring,
- discretionary AI-generated trade decisions,
- market-data persistence, replay, and multi-provider ingestion,
- production signal engine.

## Market scope
- **spot only**

This scope was chosen to keep the domain simple while the orchestration layer is being built.

## Current recommended next step
**Validate and explicitly enable the external BTC evaluation cadence.** This is the same step named
in `docs/project/next-steps.md`, which is authoritative if the two ever disagree.

Validate the prepared Docker evaluator first — sequential runs, concurrent-skip, expired-lease
takeover — before installing any timer. The host is not yet chosen. Keep Telegram delivery manual
and opt-in; keep trading out of scope.

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

It is the **foundation plus a working, persisted, end-to-end BTC research loop**: eighteen durable
product entities behind service-owned write paths, a shared Prisma bundle with real-Postgres
integration coverage, live public market ingestion, deterministic detection, bounded evaluation and
aggregation, a complete human-in-the-loop review and execution chain, and at-most-once
decision-support delivery under durable run ownership — with cadence still externally owned and
trading still absent.
