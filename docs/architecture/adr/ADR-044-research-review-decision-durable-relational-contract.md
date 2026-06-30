# ADR-044: Research Review Decision Durable Relational Contract

## Status
Accepted

## Context
The repo already has:
- one shared Prisma-backed repository bundle through `research_decision_approval`
- one shared real-Postgres integration flow through `research_decision_approval`
- `ResearchReviewDecision` in the domain model
- implemented in-memory persistence and a service-owned write path for `ResearchReviewDecision`

The next downstream service-owned persistence gap is `research_review_decision`.

That entity already exists and participates in the review flow, but it did not yet have an explicit durable relational contract. Without that contract, schema work for the review-decision slice would start from storage guesses instead of a defined boundary.

## Decision
Add a logical durable relational contract for `research_review_decision`.

The contract includes:
- one durable record type
- required review-packet and setup-family references
- optional setup-revision and hypothesis references
- reviewer identity and review timestamp fields
- decision outcome and status fields
- nullable reviewer notes and nullable authorized-next-action fields
- standard product-domain metadata and optimistic version semantics

## Consequences
Positive:
- the next downstream review slice now has an explicit logical storage contract
- physical schema work can stay narrow and deterministic
- the repo preserves the pattern of contract first, schema second, adapters third

Tradeoffs:
- this step does not yet add Prisma schema or SQL migration artifacts
- review packets remain query-owned references rather than relational FK targets in this step
- later review/execution durable slices remain outside durable relational coverage

## Explicitly not included
- Prisma schema or migration changes
- repository adapter or mapper implementations
- concrete relational repositories or Prisma adapters
- later review/execution durable slices
- runtime review/execution engines
- UI work

## Follow-up
- the Prisma physical schema and SQL migration for `research_review_decision` are completed in ADR-045
- add the repository adapter contract and repository rollout for `research_review_decision`
