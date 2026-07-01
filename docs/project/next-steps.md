# Next Steps

## Current recommended next step
### Extend the shared implemented-product composition and real-Postgres integration path through `research_review_decision`

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
- one shared Prisma-backed repository bundle now spans the full implemented product chain through `research_decision_approval`
- one end-to-end real-Postgres integration path now also spans the full implemented product chain through `research_decision_approval`
- `research_review_decision` now also has:
  - a durable relational contract
  - committed Prisma schema and migration artifacts
  - a repository adapter contract
  - domain/durable mappers
  - an adapter-backed relational repository
  - a concrete Prisma adapter
  - slice-level shared composition
- that entity already exists in the domain model and in implemented in-memory persistence
- the next downstream service-owned persistence gap is now the shared implemented-product bundle and real-database integration path through `research_review_decision`
- the shared Prisma-backed bundle and the opt-in real-Postgres integration flow still stop at `research_decision_approval`
- runtime engines are still intentionally out of scope, so the next bounded step should stay narrow and persistence-focused

## Recommended near-future sequence
1. extend the shared implemented-product composition and real-Postgres integration path through `research_review_decision`
2. keep later review/execution entities deferred until the review-decision slice pattern is verified

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding into runtime review/execution workflow logic prematurely
- mixing setup-mutation or refinement execution behavior into the review-decision composition/integration step

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
