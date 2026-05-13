# ADR-029: First Adapter-Backed Relational Repositories

## Status
Accepted

## Context
The repo already had:
- implemented in-memory domain repositories,
- durable relational record contracts,
- a relational adapter contract,
- and committed physical Prisma schema/migration artifacts.

The next missing layer was executable repository logic that:
- hydrates domain records from durable relational shapes,
- dehydrates domain writes into durable record bundles,
- and keeps physical persistence concerns behind the adapter contract.

Without this step, the first physical schema would still not be exercised by repository logic, and future Prisma adapter work would have no executable repository baseline.

## Decision
Implement adapter-backed relational repositories for:
- `setup_definition`
- `research_hypothesis`

plus:
- explicit hydration/dehydration mappers
- an in-memory adapter harness for repository validation

The in-memory adapter harness is accepted as a test tool only. It is not durable storage and does not change the Codex-first or product-storage positioning of the repo.

## Consequences
Positive:
- repository behavior is now executable against the relational adapter contract
- domain-to-durable mapping logic is explicit and test-backed
- future Prisma adapter work can focus on physical DB behavior instead of repository semantics

Tradeoffs:
- there are now two in-memory persistence surfaces in the repo:
  - domain-shaped in-memory repositories
  - durable-record-shaped in-memory adapter harness
- Prisma client/tooling is still not wired, so this is not yet a live relational runtime

## Explicitly not included
- Prisma client installation or generation
- concrete Prisma adapter implementation
- live PostgreSQL transaction/runtime wiring
- expansion beyond `setup_definition` and `research_hypothesis`

## Follow-up
- wire Prisma client/tooling and implement the concrete Prisma adapter for the first durable slice
