# Next Steps

## Current recommended next step
### PR #30 — schema-planning and repository-runtime rollout design for first persisted slice

Reason:
- PR #29 defines repository and service boundaries
- write ownership is explicit and the first persisted slice is chosen
- the next high-value gap is schema/repository rollout planning for `setup_definition` and `research_hypothesis`

## Recommended near-future sequence
1. define schema-planning contracts for `setup_definition` and `research_hypothesis` (no migrations yet)
2. define repository runtime rollout order and failure/retry boundaries
3. define compatibility strategy between domain contract versions and storage record versions
4. keep concrete DB writes/migrations out of scope until schema contracts are reviewed

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- implementing migrations before schema-planning contracts are explicit
- expanding first implementation slice prematurely
- mixing analytics runtime logic into repository rollout planning

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
