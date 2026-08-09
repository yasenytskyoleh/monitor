# Next Steps

## Current recommended next step
### Define the payload contract for refinement execution envelopes

Reason:
- the execution-attempt runtime now has concrete non-trading executors for
  `activate_setup_revision` and `apply_setup_lifecycle_mutation`
- the lifecycle executor resolves the explicit persisted approval reference already carried by its
  envelope and derives only the authorization-owned lifecycle action from that record
- `create_setup_refinement_request` additionally requires reviewer-supplied rationale and
  requested-change summaries, which cannot be safely inferred from routing or approval metadata

## Recommended near-future sequence
1. decide whether refinement envelopes snapshot their reviewer-supplied input at preparation time
   or refer to a separate persisted approved-command record
2. add the selected contract and validation coverage without inferring reviewer rationale or
   requested changes at execution time
3. implement the matching refinement executor through the existing execution-attempt audit boundary

## Things to avoid while moving forward
- direct product writes from orchestrator runtime paths
- treating implemented in-memory persistence as durable product storage
- changing service-owned business rules while adding persistence infrastructure
- inferring manual-approval or reviewer-supplied command fields from routing metadata
- dispatching envelopes through a provider, queue, retry scheduler, or trading integration

## Baseline verification commands
Use these commands before and after implementation work:

```bash
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration
pnpm typecheck
pnpm test
```
