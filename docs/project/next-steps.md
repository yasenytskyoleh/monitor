# Next Steps

## Current recommended next step
### Plan the durable relational contract and schema for `research_feedback_decision`

Reason:
- the core setup -> hypothesis -> candidate -> evaluation -> aggregate chain now has:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
- one shared Prisma-backed repository bundle and one end-to-end integration path
- `research_feedback_decision` is the next service-owned product entity downstream of aggregate evidence and upstream of approval/refinement flows
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused

## Recommended near-future sequence
1. define the durable record contract for `research_feedback_decision`
2. define reference, version, and metadata mapping rules for:
   - `setup_definition`
   - `research_hypothesis`
   - optional `setup_aggregate_result`
3. define the Prisma schema and migration plan, but stop before repository/adapter implementation
4. keep approval/review/execution durable slices deferred until the feedback-decision persistence direction is explicit

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding the durable rollout slice prematurely
- mixing approval/execution workflow logic into the feedback-decision contract/schema step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
