# Next Steps

## Current recommended next step
### Define delivery reconciliation for ambiguous Telegram attempts

Reason:
- eligible BTC notifications now have a unique durable record, immutable evidence snapshot, and
  at-most-once delivery claim
- a provider-neutral contract records stable delivered/failed outcomes without storing provider
  payloads
- Telegram is the first explicit configured delivery adapter; it returns stable outcomes without
  reading or persisting response bodies
- a process crash after `delivery_attempted` and before terminal outcome recording has no explicit
  reconciliation workflow yet

## Recommended near-future sequence
1. define reconciliation for a `delivery_attempted` record with no terminal outcome, preserving
   the at-most-once user-alert guarantee
2. add an explicit caller workflow that claims, invokes Telegram, and records a terminal outcome
3. add a scheduler/worker only after reconciliation and caller workflow semantics are explicit

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- inferring manual-approval or reviewer-supplied command fields from routing metadata
- adding provider retries, a queue, scheduler, or trading integration before reconciliation is
  explicit
- presenting an alert as investment advice or using it to place an order automatically

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
