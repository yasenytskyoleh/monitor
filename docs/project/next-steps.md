# Next Steps

## Current recommended next step
### Extend opt-in real-Postgres integration coverage through `routed_action_execution_envelope`

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
- `routed_action_execution_envelope` now also has:
  - a durable relational contract
  - committed Prisma schema and migration artifacts
  - a repository adapter contract
  - domain/durable mappers
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
- one shared Prisma-backed repository bundle now spans the full implemented product chain through `routed_action_execution_envelope`
- the opt-in real-Postgres integration path still stops at `research_review_decision`
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and integration-focused

## Recommended near-future sequence
1. extend opt-in real-Postgres integration coverage through `routed_action_execution_envelope`
2. keep later review/execution entities deferred until the routed-action full shared persistence pattern is verified
3. only then move to the next downstream execution or mutation durable slice

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding into runtime review/execution workflow logic prematurely
- mixing later durable-slice work or setup-mutation runtime behavior into the routed-action integration step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
