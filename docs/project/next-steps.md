# Next Steps

## Current recommended next step
### PR #25 — setup detection architecture on top of normalized monitoring events

Reason:
- PR #24 defines monitoring source contracts and normalized event boundaries
- product-domain entities now have an ingestion-side contract surface
- the next high-value gap is explicit setup-detection boundaries before implementation

## Recommended near-future sequence
1. define setup-detection input contracts from `NormalizedMarketEvent`
2. define detection output contract and how it maps into `SignalCandidate`
3. define candidate deduplication and basic lifecycle transition assumptions
4. keep ingestion scope contract-first (no connector runtime expansion yet)

## Things to avoid while moving forward
- jumping directly into exchange connector implementation
- mixing provider payload parsing with setup-detection semantics
- broad storage/migration expansion before detection contracts stabilize
- scope creep into execution/trading behavior

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
