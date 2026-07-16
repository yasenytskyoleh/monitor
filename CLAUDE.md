# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Monitor is an agent-assisted crypto monitoring, research, and decision-support platform — **not** an autonomous trading bot. A pnpm + Turborepo monorepo, ESM throughout, TypeScript 5.9 (`strict`, `noUncheckedIndexedAccess`). The current focus is building out product-domain durable persistence (Prisma/Postgres) one narrow slice at a time.

The living source of truth is `docs/project/` — start with `docs/project/next-steps.md` and `docs/project/current-phase.md`. These are kept up to date and **must be updated when repo reality changes**.

## Commands

Package manager is **pnpm** (`pnpm@10.18.0`) — never switch it. Turbo fans commands out from the root.

```bash
# Root (fan out across all packages via turbo)
pnpm build
pnpm test
pnpm typecheck
pnpm lint                 # NOTE: lint == typecheck (see below)
pnpm test:integration     # domain-model integration tests
pnpm verify:persistence   # domain-model typecheck + test + test:integration
pnpm runner -- <args>     # run the app (apps/orchestrator-runner)

# Per package (@monitor/agent-config, @monitor/orchestrator-core,
#              @monitor/domain-model, @monitor/orchestrator-runner)
pnpm --filter @monitor/domain-model <script>
```

**Tests** use Node's built-in `node:test` runner via `tsx` — there is no jest/vitest and no test config files (the glob is inline in each `test` script). Unit tests are `*.test.ts`; integration tests are `*.integration.test.ts` (domain-model only). Note `pnpm --filter @monitor/domain-model test` runs both; `test:integration` narrows to integration only.

```bash
# Single test file
pnpm --filter @monitor/domain-model exec node --import tsx --test --test-concurrency=1 test/<file>.test.ts

# Single test by name (append the pattern flag)
pnpm --filter @monitor/domain-model exec node --import tsx --test --test-name-pattern="<pattern>" test/<file>.test.ts
```

**`lint` == typecheck.** There is no ESLint or Prettier in this repo; every package's `lint` script is `tsc -p tsconfig.json --noEmit`. Formatting is not enforced by tooling — match the surrounding style.

**Prisma** lives in `packages/domain-model`. Schema is `prisma/schema.prisma`; the client is generated into `src/generated/prisma/` (checked into git and imported by adapters). The only Prisma script is `prisma:generate`, and every `build`/`test`/`typecheck`/`lint` in that package auto-runs it first via `pre*` hooks. Migrations are run with the CLI directly (Prisma 7 requires `--config`):

```bash
pnpm --filter @monitor/domain-model exec prisma migrate dev --config prisma.config.ts
```

Integration tests are **opt-in**: they skip cleanly unless a Postgres URL is provided (`PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL`). DB config comes from `.env` (`DATABASE_URL` / `DIRECT_URL`).

**Baseline verification** (narrowest first): domain-model `typecheck` → `test` → `test:integration`, then root `pnpm typecheck` → `pnpm test`.

## Architecture

**Two domains, kept separate deliberately.** The *orchestration* domain (`packages/agent-config`, `packages/orchestrator-core`, `apps/orchestrator-runner`) executes workflows. The *product* domain (`packages/domain-model`) defines market/research meaning and owns durable persistence. Never mix orchestrator runtime evidence with product-domain persistence.

`packages/domain-model` is the pure domain + persistence package. **Its public API is entirely `src/index.ts`, a barrel of re-exports — new exports must be added there.**

### Persistence: ports & adapters (hexagonal), repeated per entity

Write flow for an entity `X`:

```
Domain object
  → dehydrate* mappers
  → …DurableRecord            (durable relational contract, src/storage/X-relational-slice.ts)
  → RelationalXRepository      (domain-interface impl; holds only an adapter, no Prisma)
  → adapter PORT              (src/repositories/X-relational-repository-adapter.ts)
  → InMemoryX…Adapter | PrismaX…Adapter
  → generated Prisma client
```

Three repository flavors coexist and are all exported: direct `InMemoryXRepository`; `RelationalXRepository` + in-memory adapter (what contract tests run against); `RelationalXRepository` + Prisma adapter (production). Because the repository depends only on the port, swapping in-memory ↔ Prisma is just choosing which adapter you compose.

**Composition root**: `src/repositories/implemented-product-relational-prisma-client.ts` → `createImplementedProductRelationalPrismaRepositories()` wires one shared `PrismaClient` (via `@prisma/adapter-pg`, single `product_domain` Postgres schema) into every slice.

**Services own all writes**; repositories only persist/retrieve. Write-path ownership is declared in `src/services/service-boundary.ts` (`PRODUCT_WRITE_PATH_OWNERSHIP`). Optimistic concurrency is via `expectedVersion` / `version`.

### Per-entity file family (highly regular)

For an entity `X`, expect this sibling family (mostly under `src/storage/` and `src/repositories/`):

| Layer | File |
|---|---|
| Domain type | `X.ts` (in `src/review/`, `src/research/`, etc.) |
| Durable relational contract | `storage/X-relational-slice.ts` |
| Physical schema layout | `storage/X-relational-physical-schema.ts` |
| Domain repo interface | `repositories/X-repository.ts` |
| Adapter port + error taxonomy | `repositories/X-relational-repository-adapter.ts` |
| Mappers (`dehydrate*`/`hydrate*`) | `repositories/X-relational-repository-mappers.ts` |
| In-memory adapter | `repositories/X-relational-repository-adapter.impl.ts` |
| Prisma adapter | `repositories/X-relational-prisma-adapter.ts` |
| Adapter-backed repo | `repositories/X-relational-repository.impl.ts` |
| Per-slice composition | `repositories/X-relational-repositories.ts` |
| Per-slice Prisma wiring | `repositories/X-relational-prisma-client.ts` |

The `first-durable-relational-*` files are the original slice and now serve as the template ("first" is historical, not special); `src/repositories/first-durable-relational-prisma-adapter.ts` is the fullest worked example.

**Adding a persisted entity** means creating the full file family, adding the `schema.prisma` model + migration, and registering it in `PRODUCT_PERSISTED_ENTITY_TYPES`, `FIRST_CLASS_PERSISTED_ENTITY_PROFILES`, the `implemented-product-*` unions/composers, and `src/index.ts`.

### Review / versioning subsystem (`src/review/`)

The human-in-the-loop lifecycle that turns research evidence into versioned, activated setups:

*setup refinement request* → *setup definition revision* (a versioned **content** change) → *setup-lifecycle mutation record* (audit of a **status** transition) → *setup revision activation record* (promotes a revision to the live "current" one). Keep the distinction clear: a revision changes content; a mutation changes lifecycle status.

## Process discipline

This repo runs a strict, documented process. Follow it.

- **Contract-first, fail-closed, one narrow PR-sized slice at a time.** In-memory persistence lands before durable relational persistence.
- **Fixed 6-step persistence rollout** — one ADR and one commit per step: durable relational contract → Prisma schema + migration → relational adapter contract → adapter-backed repositories + Prisma adapter → shared implemented-product composition → opt-in integration coverage.
- **ADRs**: `docs/architecture/adr/ADR-NNN-kebab-title.md`, zero-padded sequential (currently through ADR-078). Fixed sections: Status / Context / Decision / Consequences (Positive + Tradeoffs) / Explicitly not included / Follow-up (names the next ADR). Write one per slice.
- **Canonical status docs are the source of truth**; read in order and update them when repo state changes: `docs/project/next-steps.md` → `current-phase.md` → `project-overview.md` → `chat-briefing.md` → `decisions-log.md`. If sources disagree, align docs before continuing feature work.
- **Out of scope — keep it that way**: runtime review/execution engines, exchange/market ingestion, evaluation/aggregation runtimes, UI, live trading.
- **Commit style**: capitalized imperative one-liners naming the entity + rollout stage (e.g. `Add setup-lifecycle mutation adapter contract`). Not Conventional Commits — no `feat:`/`fix:` prefixes, no trailers, no ticket refs.
- The repo adopts `skills/karpathy-guidelines/SKILL.md`: state assumptions, minimum code, surgical changes touching only what the task needs, test-first goal-driven execution.
