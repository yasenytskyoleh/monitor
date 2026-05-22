# Next Steps

## Current recommended next step
### Expand the durable relational rollout to `signal_candidate` and `evaluation_result`

Reason:
- first durable relational persistence contract now exists for `setup_definition` and `research_hypothesis`
- first relational adapter rollout design now exists for `setup_definition` and `research_hypothesis`
- first physical Prisma schema and initial migration now exist for `setup_definition` and `research_hypothesis`
- adapter-backed relational repositories and in-memory adapter harness now exist for `setup_definition` and `research_hypothesis`
- Prisma 7 config, generated client wiring, concrete adapter, shared repository composition, and opt-in real-database integration coverage now exist for the first durable slice
- the next unresolved gap is durable relational rollout for `signal_candidate` and `evaluation_result`

## Recommended near-future sequence
1. define the durable relational contract and physical schema for `signal_candidate`
2. add the same adapter-backed repository path for `signal_candidate`
3. repeat that slice for `evaluation_result`
4. keep `setup_aggregate_result` deferred until `signal_candidate` and `evaluation_result` parity is proven

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding the durable rollout slice prematurely
- mixing analytics runtime logic into the `signal_candidate` / `evaluation_result` durable rollout

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
