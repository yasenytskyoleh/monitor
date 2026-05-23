# Next Steps

## Current recommended next step
### Implement the adapter-backed relational repository and concrete Prisma adapter for `research_feedback_decision`

Reason:
- the core setup -> hypothesis -> candidate -> evaluation -> aggregate chain now has:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
- one shared Prisma-backed repository bundle and one end-to-end integration path
- `research_feedback_decision` now has both:
  - an explicit logical durable relational contract
  - committed Prisma schema and SQL migration artifacts
- the next missing persistence layer for that entity is the repository/adapter rollout
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused

## Recommended near-future sequence
1. define the repository adapter contract and deterministic error mapping for `research_feedback_decision`
2. add domain/durable mappers and the adapter-backed relational repository implementation
3. add the concrete Prisma adapter and opt-in real-Postgres integration coverage
4. keep `research_decision_approval` and later review/execution durable slices deferred until the feedback-decision rollout is verified

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding the durable rollout slice prematurely
- mixing approval/execution workflow logic into the feedback-decision repository/adapter step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
