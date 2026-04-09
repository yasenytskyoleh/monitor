# Chat Briefing

## Reusable project briefing
I am working on **Monitor**, a monorepo TypeScript project that is currently focused on an **agent orchestration foundation** for a future crypto monitoring/research platform.

Phase 1 is **not** about trading execution or market-data features yet. It is about:
- docs,
- contracts,
- configs,
- schemas,
- orchestration,
- runtime validation.

The repo already has:
- `docs/agents`
- `configs/agents`
- `packages/agent-config`
- `apps/orchestrator-runner`

The current workflow uses states:
- `INTAKE`
- `DESIGN`
- `FORMALIZE`
- `IMPLEMENT`
- `REVIEW`
- `APPROVAL`
- `PUBLISH_SIGNAL`
- `DONE`
- `REJECTED`

Current status:
- Product Agent is already live-capable
- per-agent execution mode selection exists
- persisted workflow artifacts exist

The next likely step is:
- **live Architect Agent**

Please preserve this project direction and avoid broad redesign unless clearly justified.

## What future chats should preserve
- The project is config-driven and schema-backed.
- Phase 1 scope is intentionally narrow.
- Spot only.
- No automated trading.
- No futures or leverage logic.
- No news/sentiment work yet.
- Runner changes should avoid hardcoded hacks.
- New live agents should be introduced gradually.
- Prefer incremental PR-sized steps.

## Behavioral instructions for future assistants
When continuing this project:
1. preserve the current architecture direction unless explicitly asked to redesign it
2. prioritize consistency between docs, config, schemas, and runtime behavior
3. avoid proposing unrelated “cool AI agent” ideas
4. treat the current repository state as the actual baseline
5. prefer small, explicit, reviewable next steps
