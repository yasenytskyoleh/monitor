# Next Steps

## Current recommended next step
### PR #27 — evaluation aggregation/statistics architecture (contracts-first)

Reason:
- PR #26 defines post-detection evaluation contracts and minimum outcome metrics
- `EvaluationResult` is now explicit, but aggregation/scoring boundaries are not yet defined
- the next high-value gap is architecture for comparing many evaluated outcomes safely

## Recommended near-future sequence
1. define aggregation input contracts from `EvaluationResult` records
2. define first statistics output contract (setup-level/window-level summaries)
3. define comparison boundary (symbol/setup/window dimensions)
4. keep runtime engines out of scope until contract layer is stable

## Things to avoid while moving forward
- adding runtime replay/statistics engines before architecture contracts stabilize
- mixing orchestration runtime concerns with product evaluation semantics
- introducing heavy metric catalogs prematurely
- scope creep into trading execution logic

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
