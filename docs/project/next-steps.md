# Next Steps

## Current recommended next step
### PR #29 — product-domain repository contracts and schema-planning architecture

Reason:
- PR #28 defines storage layers and persistence boundaries
- first-class persisted entity set is explicit, but repository/schema planning contracts are not
- the next high-value gap is defining storage access contracts without implementing DB writes

## Recommended near-future sequence
1. define repository interface contracts per persisted entity type
2. define schema-planning conventions (naming/versioning/migration boundaries) without migrations
3. define traceability conventions from `originRunId` metadata to product records
4. keep database/runtime implementation out of scope until contract layer is stable

## Things to avoid while moving forward
- implementing Prisma models/migrations before repository contracts are explicit
- mixing orchestrator evidence files with product-source-of-truth records
- adding analytics engine logic in repository-planning PRs
- scope creep into execution/trading behavior

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
