# Next Steps

## Current recommended next step
### Add the repository adapter contract for `routed_action_execution_envelope`

Reason:
- the full implemented research chain now has:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
  - `setup_aggregate_result`
  - `research_feedback_decision`
- `research_decision_approval` now also has:
  - a durable relational contract
  - committed Prisma schema and migration artifacts
  - a repository adapter contract
  - domain/durable mappers
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
- `research_review_decision` now also has:
  - a durable relational contract
  - committed Prisma schema and migration artifacts
  - a repository adapter contract
  - domain/durable mappers
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
- that entity already exists in the domain model and in implemented in-memory persistence
- one shared Prisma-backed bundle and one opt-in real-Postgres integration path now span the full implemented product chain through `research_review_decision`
- `routed_action_execution_envelope` already exists in the domain model and in implemented in-memory persistence
- `routed_action_execution_envelope` now also has a durable relational contract plus committed Prisma schema and migration artifacts
- it still has no repository adapter contract, relational repository rollout, or shared-bundle coverage
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and adapter-contract-focused

## Recommended near-future sequence
1. add the repository adapter contract for `routed_action_execution_envelope`
2. add the adapter-backed relational repository and concrete Prisma adapter for `routed_action_execution_envelope`
3. keep later review/execution entities deferred until the routed-action slice pattern is verified

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding into runtime review/execution workflow logic prematurely
- mixing repository implementation, shared-bundle rollout, or setup-mutation runtime behavior into the routed-action adapter-contract step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
