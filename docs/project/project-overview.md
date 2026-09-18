# Project Overview

## Project
**Monitor**

## Summary
Monitor is an **agent-assisted crypto monitoring and research platform**.

In the long term, it is intended to become a structured system for:
- monitoring market conditions,
- formalizing setup and signal ideas,
- evaluating them statistically,
- enriching them with context,
- and turning them into explainable decision support.

## Current product positioning
At the current stage, Monitor should be described as:

> **A Codex-first workflow around an internal orchestration subsystem and an initial product-domain model for a future crypto monitoring platform**

It is **not yet**:
- a trading system,
- a production signal engine,
- a market data platform,
- or an autonomous trading bot.

## Current implementation status

> This section previously carried an exhaustive list of every doc and ADR path. That list went
> stale on almost every commit, so it has been removed. The authoritative inventories are the
> directories themselves: `docs/architecture/adr/` (ADR-001 … ADR-104) and `docs/project/`.

The repo is usable through a **Codex-first workflow**: Codex is the primary day-to-day operator for
planning, implementation, and repo coordination; bounded autonomous mode follows
`docs/project/autonomous-mode-policy.md`; the internal orchestration subsystem remains a constrained,
test-backed supporting subsystem.

**Implemented today**

- *Orchestration*: config + schema validation, compiled immutable runtime snapshots, a workflow
  runner with `mock`/`live` modes and per-agent control, approval-gated transition guardrails,
  artifact/reference enforcement, and persisted run evidence. The live agent chain is Product,
  Architect, Quant Pattern, Backend (constrained patch mode), and Docs Reviewer.
- *Product domain*: `packages/domain-model` holds the monitoring, setup/signal, evaluation,
  research-evidence, review/execution, storage, repository, and service contracts, with durable
  Prisma/Postgres persistence for 18 entities behind service-owned write paths.
- *Market runtime*: a public Binance Spot BTC/USDT closed-candle adapter (REST backfill + live
  WebSocket with gap and stale-stream recovery), deterministic breakout detection, bounded 24-hour
  evaluation, aggregate refresh, and hypothesis-evidence updates.
- *Review and execution*: the complete human-in-the-loop chain from feedback decision through
  manual approval, review packet, review decision, routing, and routed-action preparation to an
  audited execution attempt dispatching the activation, lifecycle, and refinement envelope executors.
- *Decision-support delivery*: evidence-gated BTC notification eligibility, immutable retention with
  a deduplication key, and one provider-neutral at-most-once delivery lifecycle with lease-based
  claiming and no-resend reconciliation. Telegram is the only adapter and stays manual.
- *Operations*: durable cross-process run ownership for bounded jobs in a separate `runtime_control`
  schema, plus a containerized runtime with migration, canonical seed, bounded smoke, and
  long-running Compose workflows.

**Current limitations**

- Backend live mode stays constrained to allowlisted patch mode: isolated apply, verification,
  rollback, controlled promotion, narrow helper-file creation. No broad refactors, schema or
  architecture changes, or cross-package scope.
- `pattern_notification` is the one persisted entity that bypasses the ports-and-adapters pattern —
  it has a direct Prisma repository only, and is not in the shared bundle.
- `review_decision_routing_result` is persisted without a declared write-path owner.
- External evaluator cadence is prepared for macOS and Linux but **installed on neither host**.
- There is no CI, and no UI.

Current recommended next step: **validate and explicitly enable the external BTC evaluation
cadence** (see `docs/project/next-steps.md`). Keep alerts as explainable human decision support;
keep automated trading out of the current phase.

## Core philosophy
The project is intentionally built as a **controlled orchestration system**, not as a collection of freeform AI prompts.

This means:
- docs define human contracts,
- YAML configs define editable operational behavior,
- JSON Schemas define machine validation,
- runtime code enforces those rules,
- agents operate under explicit boundaries, permissions, and workflow states.

## Why the project exists
The main motivation is to create a system where Codex and constrained automation can help with:
- research,
- planning,
- architecture work,
- workflow execution,
- and later signal/pattern development,

without losing:
- control,
- traceability,
- validation,
- reproducibility,
- and architectural discipline.

The product-domain scope is deliberately narrow:
- Binance BTC/USDT ingestion is implemented; generalized multi-provider ingestion is not,
- bounded 24-hour candidate evaluation is implemented; unattended scheduling is not,
- aggregation and hypothesis-evidence runtimes exist, but there is no statistics or scoring engine,
- durable relational persistence is implemented for all 18 product entities, with
  `pattern_notification` still outside the shared ports-and-adapters composition,
- the Binance Spot integration is deliberately limited to public BTC/USDT candle reads.

## Long-term product idea
In its fuller form, Monitor is meant to become a **crypto market monitoring, signal research, and decision-support platform**.

The product vision is closer to:

> **a research and monitoring operating system for crypto setups**

than to:

> **a black-box system that buys and sells automatically**.

## User problem it solves
In discretionary or semi-systematic trading/research, useful ideas are often lost in chaos:
- too many charts,
- too many indicators,
- weak traceability,
- no structured evaluation of pattern quality,
- no long-term storage of what worked,
- fragmented workflows across alerts, notes, and manual analysis.

Monitor aims to turn that chaos into a **structured system**.

## Core product promise
The core promise of Monitor is:

> “Help me turn trading and market ideas into structured, testable, monitored, and explainable workflows.”

## Intended users
The most natural users are:
- individual trader/researchers,
- technically oriented discretionary traders,
- quant-curious builders,
- small teams that want structured market research instead of uncontrolled signal spam.

## Conceptual product layers
1. **Orchestration foundation**  
   roles, workflows, approvals, configs, schemas, runtime validation, artifact persistence

2. **Research operating layer**  
   setup definitions, hypotheses, evaluation flows, research artifacts

3. **Monitoring layer**  
   market watching and candidate event generation

4. **Evaluation and scoring layer**  
   statistical comparison and quality estimation

5. **Enrichment layer**  
   later: regime and news-like context

6. **Decision-support layer**  
   structured and explainable setup intelligence for the user

## Long-term positioning
A good long-term positioning line:

> **Monitor is a structured crypto monitoring and signal-research platform that turns ideas, workflows, and market observations into validated, traceable decision support.**
