# Chat Briefing

## Reusable project briefing

I am working on **Monitor**, a pnpm + Turborepo TypeScript monorepo (ESM, `strict`) that combines a
controlled agent-orchestration foundation with a product domain for crypto monitoring, evaluation,
research evidence, and durable persistence. It is decision support, **not** a trading bot.

The working model is **Codex-first**: Codex is the main operator for planning, implementation, and
repo coordination; bounded autonomous execution follows `docs/project/autonomous-mode-policy.md`;
the in-repo orchestration subsystem is a constrained supporting tool, not the required interface.

### What exists

- **Orchestration** — `packages/agent-config`, `packages/orchestrator-core`,
  `apps/orchestrator-runner`: config/schema validation, immutable runtime snapshots, workflow
  execution with approval-gated transitions, artifact enforcement, persisted run evidence, and a
  constrained live backend mode with isolated apply/verify/rollback/promotion.
- **Product domain** — `packages/domain-model`: monitoring, setup/signal, evaluation,
  research-evidence, review/execution, storage, repository, and service contracts. 18 entities have
  durable Prisma/Postgres persistence behind service-owned write paths, composed through one shared
  bundle with real-Postgres integration coverage.
- **Market and research runtimes** — `binance-spot` (public BTC/USDT closed candles, REST backfill +
  live WebSocket with gap/stale recovery), `pattern-detection`, `candle-evaluation`,
  `evaluation-aggregation`, `hypothesis-evidence`.
- **Review and execution chain** — `setup-feedback`, `research-decision-approval`, `review-packet`,
  `review-decision`, `review-decision-routing`, `routed-action-preparation`, `execution-attempt`,
  and the `activation-`/`lifecycle-`/`refinement-envelope-executor` packages, plus `setup-revision`,
  `setup-activation`, `setup-lifecycle`, `setup-refinement`.
- **Delivery** — `pattern-notification`: eligibility, immutable retention, lease-based at-most-once
  delivery, no-resend reconciliation, Telegram adapter.
- **App** — `apps/btc-monitor`: the runnable pilot. `start` is long-running; `evaluate`, `notify`,
  `seed`, `smoke` are bounded and take durable ownership in `runtime_control.scheduled_job_run`.

Full inventories live in the directories themselves — `docs/architecture/adr/` (ADR-001 … ADR-104)
and `docs/project/`. Do not re-create hand-maintained copies of those lists here; doing so is what
made this file drift in the first place.

## Current constraints

- spot only; public BTC/USDT candle reads only — no credentialed or multi-provider ingestion
- no statistics or scoring engine
- no UI
- no automated trading, order placement, or investment advice
- no scheduler daemon, provider retry, or unbounded queue — cadence is externally owned
- Telegram delivery is manual and opt-in; alerts are explainable decision support only
- `pattern_notification` is the one persisted entity outside the shared ports-and-adapters
  composition (direct Prisma repository only)
- `review_decision_routing_result` is persisted with no declared write-path owner
- external evaluator cadence is prepared for macOS and Linux but installed on neither
- no CI; baseline verification is manual

## Recommended next step

**Validate and explicitly enable the external BTC evaluation cadence** — see
`docs/project/next-steps.md`, which is the authoritative source for this.

## Behavioral instructions for future assistants
When continuing this project:
1. preserve the Codex-first workflow and use the internal orchestration subsystem as a supporting tool, not as the required primary interface
2. preserve orchestration safety constraints while product-domain implementation grows
3. keep orchestrator runtime evidence and product-domain persistence separate
4. enforce service-owned write paths and repository-owned persistence abstraction
5. keep runtime engines out of scope and keep new durable slices narrowly aligned to the committed adapter/repository/integration pattern
6. prefer small, explicit, reviewable PR-sized steps
