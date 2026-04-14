# First Persisted Slice

## Implemented scope (PR #30)
First implemented persisted product entities:
- `SetupDefinition`
- `ResearchHypothesis`

## Why this slice first
- directly supports the product promise: structured, testable research workflows
- does not depend on live market ingestion runtime
- enables persistence of product meaning early (ideas, hypotheses, setup intent)
- keeps initial implementation scope narrow and reviewable

## What is now truly persisted
- concrete in-memory repositories for setup definitions and research hypotheses
- optimistic version checks through `expectedVersion` repository contracts
- persisted status/lifecycle updates through explicit repository status methods
- persisted records remain product-domain entities and are not stored in orchestrator runtime folders

Implementation references:
- `packages/domain-model/src/repositories/setup-definition-repository.impl.ts`
- `packages/domain-model/src/repositories/research-hypothesis-repository.impl.ts`

## Write ownership now enforced
- `SetupDefinitionService` owns setup creation, updates, activation, archiving, and required-field validation
- `ResearchService` owns hypothesis creation, updates, status transitions, and controlled linkage to setup definitions
- repositories persist and retrieve records, while services enforce write semantics and transitions

Implementation references:
- `packages/domain-model/src/services/setup-definition-service.ts`
- `packages/domain-model/src/services/research-service.ts`

## What remains for later slices
- candidate persistence runtime flows
- evaluation-result runtime persistence
- aggregate-result runtime persistence
- relational storage implementation (PostgreSQL/Prisma), schema, and migrations

## Tests for this slice
- `packages/domain-model/test/first-persisted-slice.test.ts`

Covered cases:
- create/update/archive setup definition
- create/update/link research hypothesis
- invalid setup definition rejected
- invalid research hypothesis rejected

## Contract and boundary references
- `packages/domain-model/src/repositories/setup-definition-repository.ts`
- `packages/domain-model/src/repositories/research-hypothesis-repository.ts`
- `packages/domain-model/src/services/service-boundary.ts`
