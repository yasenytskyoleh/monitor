# Next Steps

## Current recommended next step
### Select and configure the first notification provider

Reason:
- eligible BTC notifications now have a unique durable record, immutable evidence snapshot, and
  at-most-once delivery claim
- a provider-neutral contract records stable delivered/failed outcomes without storing provider
  payloads
- no provider, recipient configuration, scheduler, queue, or recovery/reconciliation workflow
  exists yet

## Recommended near-future sequence
1. choose the first notification channel and recipient configuration, then implement one explicit
   provider adapter behind `PatternNotificationDeliveryPort`
2. define reconciliation for an `delivery_attempted` record with no terminal outcome
3. add a scheduler/worker only after provider and reconciliation semantics are explicit

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- inferring manual-approval or reviewer-supplied command fields from routing metadata
- introducing a provider, queue, retry scheduler, or trading integration without explicit channel,
  recipient, and reconciliation decisions
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
