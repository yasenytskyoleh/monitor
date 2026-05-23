# Next Steps

## Current recommended next step
### Define the Prisma physical schema and migration layout for `research_feedback_decision`

Reason:
- the core setup -> hypothesis -> candidate -> evaluation -> aggregate chain now has:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
- one shared Prisma-backed repository bundle and one end-to-end integration path
- `research_feedback_decision` now has an explicit logical durable relational contract
- the next missing persistence artifact for that entity is the physical schema/migration layer
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused

## Recommended near-future sequence
1. define physical schema constants for `research_feedback_decision`:
   - Prisma model name
   - table name
   - index names
   - required columns
2. add the Prisma schema model and SQL migration for:
   - required `setup_definition`
   - required `research_hypothesis`
   - optional `setup_aggregate_result`
3. enforce the narrow contract rules with relational constraints and checks, but stop before repository/adapter implementation
4. keep approval/review/execution durable slices deferred until the feedback-decision physical layout is committed

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding the durable rollout slice prematurely
- mixing approval/execution workflow logic into the feedback-decision schema step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
