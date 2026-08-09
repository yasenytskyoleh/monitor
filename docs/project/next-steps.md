# Next Steps

## Current recommended next step
### Define the BTC pattern-notification contract

Reason:
- all currently supported non-trading routed-action targets now execute through the audited
  execution-attempt boundary
- the refinement executor snapshots reviewer-supplied rationale and requested changes at
  preparation time rather than inferring them from mutable records
- the product direction is autonomous BTC market monitoring and explainable alerts, but it has no
  durable notification contract or delivery boundary yet

## Recommended near-future sequence
1. define a provider-neutral notification candidate that links a detected BTC setup, current market
   state, timeframe, price context, and supporting evaluation evidence
2. define explicit notification eligibility and deduplication rules so a signal cannot repeatedly
   alert without a meaningful state change
3. add a delivery boundary that records attempted and delivered alerts, while leaving exchanges and
   order placement out of scope

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
