# Next Steps

## Current recommended next step
### Prisma client/tooling wiring and concrete Prisma adapter implementation for the first durable slice

Reason:
- first durable relational persistence contract now exists for `setup_definition` and `research_hypothesis`
- first relational adapter rollout design now exists for `setup_definition` and `research_hypothesis`
- first physical Prisma schema and initial migration now exist for `setup_definition` and `research_hypothesis`
- adapter-backed relational repositories and in-memory adapter harness now exist for `setup_definition` and `research_hypothesis`
- the next unresolved gap is the concrete Prisma adapter and runtime wiring against that schema

## Recommended near-future sequence
1. wire Prisma client/tooling for `packages/domain-model`
2. implement the concrete Prisma adapter for `setup_definition` and `research_hypothesis`
3. run parity tests against the current adapter-backed repository baseline
4. keep slice scope narrow until concrete Prisma adapter parity is proven

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding the durable rollout slice prematurely
- mixing analytics runtime logic into first-slice concrete Prisma adapter implementation

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
