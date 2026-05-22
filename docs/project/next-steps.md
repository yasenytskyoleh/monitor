# Next Steps

## Current recommended next step
### Compose a shared Prisma-backed repository bundle and end-to-end integration flow for the implemented durable entities

Reason:
- adapter-backed relational repositories, concrete Prisma adapters, slice-level shared composition, and opt-in real-database integration coverage now exist for:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
- the remaining gap is broader cross-slice composition and one real-database flow that proves setup -> candidate -> evaluation -> aggregate persistence together
- runtime engines are still intentionally out of scope, so the next bounded step should stay inside persistence infrastructure

## Recommended near-future sequence
1. add one shared repository factory around a single Prisma client for:
   - `setup_definition`
   - `research_hypothesis`
   - `signal_candidate`
   - `evaluation_result`
   - `setup_aggregate_result`
2. add real-Postgres integration coverage across setup -> candidate -> evaluation -> aggregate repository flow
3. keep service/business-rule logic unchanged while composing the shared persistence boundary
4. keep runtime detection/evaluation/aggregation engines deferred until shared persistence composition is proven

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding the durable rollout slice prematurely
- mixing runtime aggregation logic into the shared persistence-composition step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
