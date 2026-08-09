# Next Steps

## Current recommended next step
### Define the payload contract for remaining non-trading execution envelopes

Reason:
- the implemented generic execution-attempt runtime has one concrete executor for
  `activate_setup_revision`
- the remaining `apply_setup_lifecycle_mutation` and `create_setup_refinement_request` envelopes
  currently retain routing references only, while their service commands require an explicit
  approved decision, action/input, and operator-supplied fields; refinement additionally requires
  rationale and requested-change summaries
- inferring those missing fields during execution would bypass the service-owned approval boundary
  and weaken auditability

## Recommended near-future sequence
1. decide whether each remaining envelope snapshots all required approved-command fields at
   preparation time or instead resolves an explicitly persisted approved-command reference
2. add the selected contract and validation coverage without inferring approval, lifecycle action,
   reviewer rationale, or requested changes at execution time
3. implement one matching non-trading executor through the existing execution-attempt audit boundary

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
