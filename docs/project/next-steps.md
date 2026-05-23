# Next Steps

## Current recommended next step
### Extend the shared implemented-product repository bundle and end-to-end real-Postgres integration path through `research_feedback_decision`

Reason:
- the core setup -> hypothesis -> candidate -> evaluation -> aggregate chain now has:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
- one shared Prisma-backed repository bundle and one end-to-end integration path
- `research_feedback_decision` now also has:
  - an explicit logical durable relational contract
  - committed Prisma schema and SQL migration artifacts
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
  - opt-in real-Postgres integration coverage
- the remaining gap is that the shared implemented-product bundle and full end-to-end integration path still stop before `research_feedback_decision`
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused

## Recommended near-future sequence
1. add `research_feedback_decision` into the shared implemented-product relational repository composition
2. extend the real-Postgres integration flow through setup -> candidate -> evaluation -> aggregate -> feedback decision
3. verify the shared bundle still preserves service-owned write boundaries and deterministic repository errors
4. keep `research_decision_approval` and later review/execution durable slices deferred until the expanded shared bundle is verified

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding into approval/execution workflow logic prematurely
- mixing new review-policy behavior into the shared bundle extension step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
