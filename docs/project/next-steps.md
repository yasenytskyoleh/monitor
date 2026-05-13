# Next Steps

## Current recommended next step
### Prisma tooling and relational adapter implementation for the first durable slice

Reason:
- first durable relational persistence contract now exists for `setup_definition` and `research_hypothesis`
- first relational adapter rollout design now exists for `setup_definition` and `research_hypothesis`
- first physical Prisma schema and initial migration now exist for `setup_definition` and `research_hypothesis`
- the next unresolved gap is repository/adapter wiring against that schema

## Recommended near-future sequence
1. wire Prisma tooling/client generation for `packages/domain-model`
2. implement relational repositories/adapters against the committed first-slice schema
3. run parity tests against current in-memory repository semantics
4. keep slice scope narrow until adapter parity is proven

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding the durable rollout slice prematurely
- mixing analytics runtime logic into first-slice relational adapter implementation

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
