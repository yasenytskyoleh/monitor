# ADR-082: Review Decision Routing Result Relational Adapter Contract

## Status
Accepted

## Context
`review_decision_routing_result` has a durable contract and committed Prisma schema, but it lacked an adapter boundary between later relational repositories and physical storage.

Without this contract, later repository and Prisma work could leak foreign-key handling and persistence-error classification into domain-facing code.

## Decision
Adopt a durable-record-facing relational adapter for `review_decision_routing_result`.

The adapter exposes `load`, `listByResearchReviewDecisionId`, and `insert` operations. Its create path maps duplicate identifiers to `already_exists` and missing `research_review_decision` references to `invalid_reference`; transient and uncategorized storage failures remain retryable classifications.

The in-memory adapter validates the same source review-decision relationship as the physical foreign key.

## Consequences
Positive:
- later repository code can remain independent of Prisma and SQL details
- deterministic create failures are testable before database wiring
- the create-only persistence boundary matches the current routing-result repository

Tradeoffs:
- this adds a narrow layer before mappers, relational repositories, and Prisma adapters

## Explicitly not included
- routing-result domain/durable mappers
- adapter-backed relational repository or Prisma adapter implementation
- service-owned routing-result write-path changes
- shared bundle and real-Postgres integration extension

## Follow-up
- implement routing-result mappers, relational repository, and Prisma adapter
