# ADR-027: First Relational Adapter Rollout Design

## Status
Accepted — 2026-05-12

## Context
After the first durable relational persistence contract was defined, the repo still lacked an explicit adapter-layer contract for how repositories should interact with future relational storage.

Without that design, future DB implementation work risks:
- leaking physical persistence concerns into services,
- changing repository semantics silently,
- and handling duplicate/missing/version-conflict failures inconsistently.

## Decision
Adopt a first relational adapter rollout design for:
- `setup_definition`
- `research_hypothesis`
- explicit `research_hypothesis <-> setup_definition` linkage

Decision rules:
- repositories remain domain-facing
- adapters operate on durable relational record contracts
- `ResearchHypothesis` row and link-set writes are atomic bundle writes
- deterministic persistence failures map to:
  - `already_exists`
  - `not_found`
  - `version_mismatch`
  - `invalid_reference`
- retryable persistence failures map to:
  - `transient_failure`
  - `unknown_failure`

## Consequences

### Positive
- physical DB work now has a stable adapter boundary
- optimistic concurrency behavior remains explicit before runtime adapter wiring
- deterministic persistence failure handling can be tested independently of DB choice

### Tradeoffs
- another contract layer exists before runtime adapter implementation
- physical schema details were intentionally delayed until after the adapter boundary was made explicit

## Explicitly postponed
- Prisma client/runtime wiring
- repository wiring to live DB runtime
- expansion beyond the first durable slice

## Guardrails
- no changes to service-owned business rules in this ADR
- no changes to domain-facing repository method signatures in this ADR
- no direct service-to-DB coupling
- no runtime orchestration changes

## Follow-up
- wire Prisma tooling and implement relational repositories/adapters for the first durable slice against this adapter contract
