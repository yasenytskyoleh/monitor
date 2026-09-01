# Next Steps

## Current recommended next step
### Add a bounded scheduler and lease-aware reconciliation runner

Reason:
- eligible BTC notifications now have a unique durable record, immutable evidence snapshot, and
  at-most-once delivery claim
- a provider-neutral contract records stable delivered/failed outcomes without storing provider
  payloads
- Telegram is the first explicit configured delivery adapter; it returns stable outcomes without
  reading or persisting response bodies
- an ambiguous `delivery_attempted` record can now be terminalized after a caller-defined grace
  period as `delivery_outcome_unconfirmed`, without re-queueing or resending the alert
- the claim, Telegram invocation, and terminal-outcome recording steps are now composed in one
  explicit caller workflow with an `outcome_unconfirmed` result for ambiguous completion
- a caller-invoked dispatch now declares an in-process cadence guard and bounded delivery work
- leased delivery attempts now persist an owner ID and expiry; terminal recording requires that
  owner and reconciliation waits for expiry
- the Telegram workflow now acquires a durable lease at claim time, bounds Telegram execution,
  and reserves positive terminal-recording grace before expiry

## Recommended near-future sequence
1. add a bounded scheduler/worker with lease-aware reconciliation and observable run ownership
2. connect a real monitored BTC market-data ingestion path after the delivery runtime's process
   ownership is explicit

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- inferring manual-approval or reviewer-supplied command fields from routing metadata
- adding provider retries, an unbounded queue, automatic reconciliation, or trading integration
  before the lease and scheduler contracts are explicit
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
