# Next Steps

## Current recommended next step
### PR #28 — aggregation interpretation and scoring-boundary architecture (contracts-first)

Reason:
- PR #27 defines setup aggregate evidence and comparison contracts
- aggregate artifacts now exist, but interpretation/scoring boundaries are not yet explicit
- the next high-value gap is defining how aggregate evidence should be consumed safely

## Recommended near-future sequence
1. define interpretation input contracts from `SetupAggregateResult` and `SetupComparison`
2. define scoring-boundary contracts (still descriptive, not optimization engines)
3. define hypothesis update workflow boundaries using evidence-link contracts
4. keep runtime analytics engines out of scope until contract layer is stable

## Things to avoid while moving forward
- implementing ranking/scoring engines before architecture contracts stabilize
- adding advanced quant significance machinery prematurely
- mixing orchestration runtime concerns with research-domain semantics
- scope creep into trading execution behavior

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
