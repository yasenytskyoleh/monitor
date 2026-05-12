# Next Steps

## Current recommended next step
### Relational adapter rollout design for the planned first durable slice

Reason:
- first durable relational persistence contract now exists for `setup_definition` and `research_hypothesis`
- write ownership is explicit and the durable record contract is now defined
- the next unresolved gap before migrations is adapter hydration/dehydration and deterministic error-boundary design

## Recommended near-future sequence
1. define relational repository adapter read/write rules for `setup_definition` and `research_hypothesis`
2. define deterministic error mapping for `already exists`, `not found`, and `version mismatch`
3. define migration rollout order and compatibility checks for `product_domain.relational.v1`
4. only then implement Prisma schema and migrations for the first durable slice

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- implementing migrations before adapter contracts are explicit
- expanding the durable rollout slice prematurely
- mixing analytics runtime logic into relational adapter design

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
