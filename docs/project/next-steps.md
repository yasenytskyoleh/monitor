# Next Steps

## Current recommended next step
### Shared repository composition and real-database integration for the first durable slice

Reason:
- first durable relational persistence contract now exists for `setup_definition` and `research_hypothesis`
- first relational adapter rollout design now exists for `setup_definition` and `research_hypothesis`
- first physical Prisma schema and initial migration now exist for `setup_definition` and `research_hypothesis`
- adapter-backed relational repositories and in-memory adapter harness now exist for `setup_definition` and `research_hypothesis`
- Prisma 7 config, generated client wiring, concrete adapter, and client factory now exist for the first durable slice
- the next unresolved gap is shared repository composition plus real-database integration coverage against that schema

## Recommended near-future sequence
1. compose shared Prisma-backed repository factories for `setup_definition` and `research_hypothesis`
2. add real-database integration coverage against the committed migration/schema
3. keep parity checks against the current adapter-backed repository baseline
4. keep slice scope narrow until repository composition and real-database integration are proven

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- expanding the durable rollout slice prematurely
- mixing analytics runtime logic into first-slice repository composition or integration coverage

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```
