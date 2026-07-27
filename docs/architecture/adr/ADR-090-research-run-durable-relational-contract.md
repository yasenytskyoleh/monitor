# ADR-090: Research Run Durable Relational Contract

## Status
Accepted

## Context
`ResearchRun` groups the hypothesis, setup, candidates, evaluation windows, and evaluation results that make up one research execution. It is already a domain contract and is referenced by aggregate scope, but it is not yet a product-persisted entity and has no durable relational record shape.

## Decision
Treat `research_run` as a first-class product-persisted entity and add a logical durable relational contract.

The record retains the immutable run, hypothesis, and setup identities; the candidate, evaluation-window, and evaluation-result identifiers observed by the run; its research-run status and timestamps; and an optional summary. It uses the standard product-domain identity, metadata, lifecycle, archive, schema-version, and optimistic-version fields.

`identity.relatedEntityIds` records the hypothesis, setup, candidates, and evaluation results that the run references. The array is a durable reference snapshot, not a relational-link implementation.

## Consequences
Positive:

- aggregate scope can point to a durable research-run identity without treating runtime evidence as product state
- later repository and schema work has an explicit retention contract for run membership and completion status

Tradeoffs:

- the contract retains identifier collections before deciding whether later physical storage uses arrays or normalized links
- no existing aggregate, candidate, or evaluation behavior changes in this step

## Explicitly not included

- Prisma schema or migration changes
- repositories, services, mappers, or adapter implementations
- changes to the optional `researchRunId` aggregate-scope field
- runtime execution, ingestion, or UI behavior

## Follow-up

- define the `research_run` physical schema and migration
- add a repository adapter and mapper after the physical contract is accepted
