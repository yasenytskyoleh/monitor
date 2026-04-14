# First Persisted Slice

## Decision
First persisted product slice:
- `SetupDefinition`
- `ResearchHypothesis`

## Why this slice first
- directly supports the product promise: structured, testable research workflows
- does not depend on live market ingestion runtime
- enables persistence of product meaning early (ideas, hypotheses, setup intent)
- keeps initial implementation scope narrow and reviewable

## What this slice enables
- authoring and version-aware updates for setup definitions
- authoring and lifecycle updates for research hypotheses
- explicit trace metadata linkage to orchestrator runs when needed

## What remains for later slices
- candidate persistence runtime flows
- evaluation-result runtime persistence
- aggregate-result runtime persistence
- repository runtime implementations and schema/migrations

## Contract references
- `packages/domain-model/src/repositories/setup-definition-repository.ts`
- `packages/domain-model/src/repositories/research-hypothesis-repository.ts`
- `packages/domain-model/src/services/setup-definition-service.ts`
- `packages/domain-model/src/services/research-service.ts`
- `packages/domain-model/src/services/service-boundary.ts`
