# Next Steps

## Current recommended next step
### Add an explicit Telegram delivery caller workflow

Reason:
- eligible BTC notifications now have a unique durable record, immutable evidence snapshot, and
  at-most-once delivery claim
- a provider-neutral contract records stable delivered/failed outcomes without storing provider
  payloads
- Telegram is the first explicit configured delivery adapter; it returns stable outcomes without
  reading or persisting response bodies
- an ambiguous `delivery_attempted` record can now be terminalized after a caller-defined grace
  period as `delivery_outcome_unconfirmed`, without re-queueing or resending the alert
- the claim, Telegram invocation, and terminal-outcome recording steps are not yet composed in an
  explicit caller workflow

## Recommended near-future sequence
1. add an explicit caller workflow that claims, invokes Telegram, and records a terminal outcome
2. define caller ownership and cadence for terminalizing stale unconfirmed attempts without retry
3. add a scheduler/worker only after caller workflow and reconciliation ownership are explicit

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- inferring manual-approval or reviewer-supplied command fields from routing metadata
- adding provider retries, a queue, scheduler, or trading integration before caller workflow and
  reconciliation ownership are explicit
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
