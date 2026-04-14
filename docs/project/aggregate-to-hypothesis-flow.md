# Aggregate to Hypothesis Flow

## Happy path (first version)
1. persisted `SetupAggregateResult` exists in `completed` status
2. runtime/application layer builds `AggregateHypothesisEvidenceTrigger`
3. handoff resolves one target hypothesis id (trigger or aggregate linkage)
4. handoff validates aggregate/setup/hypothesis references and linkage
5. `ResearchService.updateHypothesisEvidence(...)` is called with explicit aggregate metrics
6. service interprets evidence as `supports` / `weakens` / `inconclusive`
7. hypothesis evidence fields and notes are updated
8. `HypothesisEvidenceUpdateResult` returns hypothesis id + evidence outcome

Coordinator:
- `createAggregateToHypothesisEvidenceHandoff`
- `packages/domain-model/src/runtime-handoff/aggregate-to-hypothesis-evidence.ts`

## Failure boundaries
- missing aggregate result -> `rejected_validation`
- aggregate not eligible (`pending`, `partial`, `invalid`) -> `rejected_lifecycle`
- missing hypothesis linkage / missing hypothesis -> `rejected_linkage`
- malformed trigger or invalid evidence input -> `rejected_validation`
- unexpected runtime/service failure -> `failed` with retry warning

## Eligibility rule (first version)
- only `SetupAggregateResult.status === completed` may trigger hypothesis evidence update
- handling for `partial` is explicitly postponed

## Ownership boundaries
- aggregation side owns aggregate computation and metrics integrity
- research service owns evidence interpretation and hypothesis evidence persistence semantics
- runtime handoff owns deterministic coordination and explicit outcome mapping

## Linkage scope rule
- first version updates at most one hypothesis per trigger
- if no linked hypothesis exists, update does not occur
- multi-hypothesis fanout is postponed

## Postponed work
- batch or scheduled hypothesis evidence updates
- multi-hypothesis fanout
- significance/statistical confidence engine
- full hypothesis scoring/ranking and auto-lifecycle transitions
