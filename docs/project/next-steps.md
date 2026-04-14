# Next Steps

## Current recommended next step
### PR #24 — monitoring ingestion architecture definition (contracts-first)

Reason:
- constrained backend implementation path is already isolated, verified, rollback-safe, and promotion-safe
- first product-domain contracts are now explicit in `packages/domain-model`
- the highest-value gap is now event-ingestion architecture aligned to those contracts
- this can be designed without introducing exchange-specific production code yet

## Recommended near-future sequence
1. define monitoring ingestion boundaries and normalized market-event shape (architecture only)
2. map normalized monitoring events to `SignalCandidate` creation preconditions
3. define storage direction and repository contract candidates for product-domain entities
4. keep backend safety/stability checks green while product implementation starts incrementally

## Things to avoid while moving forward
- broad backend scope expansion before product-domain implementation starts
- exchange/vendor lock-in decisions too early
- premature DB migration complexity
- mixing orchestration-runtime concerns with product-domain entity semantics
- silent fallback from live to mock
- scope creep into automated trading behavior

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
