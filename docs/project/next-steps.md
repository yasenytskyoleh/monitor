# Next Steps

## Current recommended next step
### Persist notification candidates and add a delivery boundary

Reason:
- the pattern-notification runtime now combines a fresh detected signal with an explicit historical
  aggregate and configurable quality thresholds
- it returns a deterministic candidate and deduplication key, but it deliberately does not persist
  that result or call a provider
- autonomous BTC monitoring now has an explainable eligibility boundary, but still has no retained
  notification history or delivery outcome

## Recommended near-future sequence
1. persist an immutable notification candidate and enforce one delivery attempt per deduplication
   key through a service-owned write path
2. define a provider-neutral delivery port that records attempted, delivered, and failed outcomes
   without persisting provider payloads
3. add a scheduler/worker only after retained idempotency and delivery-audit semantics exist

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- inferring manual-approval or reviewer-supplied command fields from routing metadata
- dispatching envelopes through a provider, queue, retry scheduler, or trading integration
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
