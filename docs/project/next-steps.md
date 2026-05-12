# Next Steps

## Current recommended next step
### Durable relational persistence planning for the implemented in-memory slice

Reason:
- implemented in-memory persistence already exists for `SetupDefinition`, `ResearchHypothesis`, `SignalCandidate`, `EvaluationResult`, and `SetupAggregateResult`
- write ownership is explicit and the original first slice remains the narrow anchor for durable rollout planning
- the next high-value gap is durable relational persistence planning for `setup_definition` and `research_hypothesis`

## Recommended near-future sequence
1. define storage schema contracts for `setup_definition` and `research_hypothesis` (no migrations yet)
2. define relational repository/runtime adapter boundaries plus failure/retry behavior
3. define compatibility strategy between domain contract versions and stored record versions
4. extend the durable rollout plan to candidate/evaluation/aggregate persistence only after the first two entities are explicit

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- implementing migrations before schema contracts are explicit
- expanding the durable rollout slice prematurely
- mixing analytics runtime logic into relational persistence planning

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
