# First Persisted Slice

## Scope note
The original first persisted slice decision remains:
- `SetupDefinition`
- `ResearchHypothesis`

Since that initial slice was established, the repo now has **implemented in-memory persistence** plus service-owned write paths for:
- `SetupDefinition`
- `ResearchHypothesis`
- `SignalCandidate`
- `EvaluationResult`
- `SetupAggregateResult`

## Why this slice first
- directly supports the product promise: structured, testable research workflows
- does not depend on live market ingestion runtime
- enables persistence of product meaning early (ideas, hypotheses, setup intent)
- keeps initial implementation scope narrow and reviewable

## What is now implemented
- concrete in-memory repositories for `SetupDefinition`, `ResearchHypothesis`, `SignalCandidate`, `EvaluationResult`, and `SetupAggregateResult`
- optimistic version checks through `expectedVersion` repository contracts
- persisted status/lifecycle updates through explicit repository status methods
- persisted records remain product-domain entities and are not stored in orchestrator runtime folders

Implementation references:
- `packages/domain-model/src/repositories/setup-definition-repository.impl.ts`
- `packages/domain-model/src/repositories/research-hypothesis-repository.impl.ts`
- `packages/domain-model/src/repositories/signal-candidate-repository.impl.ts`
- `packages/domain-model/src/repositories/evaluation-result-repository.impl.ts`
- `packages/domain-model/src/repositories/setup-aggregate-result-repository.impl.ts`

## Write ownership now enforced
- `SetupDefinitionService` owns setup creation, updates, activation, archiving, and required-field validation
- `ResearchService` owns hypothesis creation, updates, status transitions, and controlled linkage to setup definitions
- `SignalCandidateService` owns candidate creation and lifecycle transitions
- `EvaluationService` owns evaluation result creation/finality rules
- `ResearchAggregationService` owns aggregate recomputation and lifecycle transitions
- repositories persist and retrieve records, while services enforce write semantics and transitions

Implementation references:
- `packages/domain-model/src/services/setup-definition-service.ts`
- `packages/domain-model/src/services/research-service.ts`
- `packages/domain-model/src/services/signal-candidate-service.ts`
- `packages/domain-model/src/services/evaluation-service.ts`
- `packages/domain-model/src/services/research-aggregation-service.ts`

## Durable relational persistence pending
- durable relational contract now exists for `setup_definition` and `research_hypothesis`
- relational adapter rollout design now exists for `setup_definition` and `research_hypothesis`
- first physical Prisma schema and initial migration now exist for `setup_definition` and `research_hypothesis`
- adapter-backed relational repositories and in-memory adapter harness now exist for `setup_definition` and `research_hypothesis`
- Prisma client/runtime wiring
- concrete Prisma adapter
- exchange ingestion runtime
- setup-detection / evaluation / aggregation runtime engines
- UI

## Tests for this slice
- `packages/domain-model/test/first-persisted-slice.test.ts`
- `packages/domain-model/test/signal-candidate-persistence.test.ts`
- `packages/domain-model/test/evaluation-result-persistence.test.ts`
- `packages/domain-model/test/setup-aggregate-result-persistence.test.ts`

Covered cases:
- create/update/archive setup definition
- create/update/link research hypothesis
- create and transition signal candidates
- create/finalize evaluation results
- create and recompute setup aggregate results
- invalid setup definition rejected
- invalid research hypothesis rejected

## Contract and boundary references
- `packages/domain-model/src/repositories/setup-definition-repository.ts`
- `packages/domain-model/src/repositories/research-hypothesis-repository.ts`
- `packages/domain-model/src/services/service-boundary.ts`
