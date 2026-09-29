# Current Phase

## Phase
**Phase 1.56 — Research workflow upstream operator composition**

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
- preserve externally owned five-minute evaluator cadence for macOS and Linux without enabling
  scheduled Telegram delivery by default; the validated macOS timer remains operational and Linux
  remains a template.
- expose the post-decision research workflow through explicit one-shot operator commands and prove
  the composed path against opt-in real Postgres without adding automatic chaining or scheduling.

## Implemented in this phase (current baseline)

> A per-file inventory used to live here and was the single largest source of doc drift.
> It is gone on purpose. For file-level detail read the code and `docs/architecture/adr/`;
> this section records only what is true, not where it lives.

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
- 18 durable product entities, including `pattern_notification`, have relational contracts,
  adapters, repository composition, and Prisma-backed persistence.
- one shared Prisma-backed bundle (`createImplementedProductRelationalPrismaRepositories`) wiring
  16 adapters across all 18 entities
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
- a dedicated `apps/research-workflow-runner` post-decision composition factory with a fail-closed
  three-target executor dispatcher, explicit `route`, `prepare`, and `execute` one-shot commands,
  and opt-in real-Postgres command-path coverage
- explainable BTC notification eligibility derived from a fresh signal candidate plus compatible
  historical aggregate evidence, retained immutably under a deduplication key
- one provider-neutral delivery lifecycle: durable lease, at-most-once send, and no-resend
  reconciliation of unconfirmed attempts. Telegram is the only adapter and stays manual.
- durable cross-process ownership for bounded jobs (`runtime_control.scheduled_job_run`):
  120-second lease, 30-second heartbeat, owner-fenced renewal and terminal writes
- containerized runtime (non-root Node 24) with migration, canonical seed, bounded real-data
  smoke, and long-running Compose workflows
- external five-minute evaluator cadence prepared for macOS launchd and Linux systemd; the macOS
  timer completed a 27.88-hour validation window on the local operator host, while Linux remains a
  template

### Known gaps carried into the next step
- ADR-111's dedicated `apps/research-workflow-runner` now operates the post-decision route ->
  prepare -> audited execution slice. Review-packet creation and review-decision recording remain
  outside the application entrypoints (see `next-steps.md`).

### Phase 1.55 completion evidence
- explicit `route`, `prepare`, and `execute` commands invoke one step per process and emit JSON
  outcomes with non-zero exits for rejected or failed results
- the production-composed disposable-Postgres test persists the routing result, execution envelope,
  terminal execution audit, setup activation record, and activated setup state
- command usage and all explicit operator inputs are documented in the app README
- root integration verification and CI include the research-workflow integration suite

### Phase 1.54 completion evidence
- 114/114 durable `btc_evaluate` runs completed across 27.88 hours with no failed or abandoned runs
- the only item-failure run was the expected controlled deployment run
  `d94cfb37-2544-493e-845b-bf25b74c55a3`
- launchd recorded 155 invocations and a last exit code of `0`
- the completed aggregate covered 197 evaluations; 104 were positive, average movement was
  `+0.702126%`, and `computed_at_utc` remained monotonic and fresh at
  `2026-09-29T00:24:59.999Z`
- transient WebSocket errors recovered and live ingestion remained active through
  `2026-09-29T07:59:59.999Z`

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
**Add explicit one-shot review-packet and review-decision entrypoints to
`apps/research-workflow-runner`.** This is the same step named in `docs/project/next-steps.md`, which
is authoritative if the two ever disagree.

Keep the workflow manually invoked and fail-closed. Do not add automatic chaining, retries,
scheduling, Telegram delivery, or trading.

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
