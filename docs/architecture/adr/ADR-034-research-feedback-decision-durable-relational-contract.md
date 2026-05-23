# ADR-034: Research Feedback Decision Durable Relational Contract

## Status
Accepted

## Context
The repo already has durable relational parity for the implemented core research chain:
- `setup_definition`
- `research_hypothesis`
- `signal_candidate`
- `evaluation_result`
- `setup_aggregate_result`

The next downstream service-owned entity is `research_feedback_decision`.

That entity already exists in the domain model and in implemented in-memory persistence, but it did not yet have an explicit durable relational contract. Without that contract, the next persistence step into review/governance entities would start from schema guesses instead of a defined storage boundary.

## Decision
Add a logical durable relational contract for `research_feedback_decision`.

The contract includes:
- one durable record type
- required setup and hypothesis references
- optional aggregate-result reference
- status, recommendation, rationale, manual-review, and reviewer-metadata fields
- standard product-domain metadata and optimistic version semantics

## Consequences
Positive:
- the next downstream persistence slice now has an explicit logical storage contract
- physical schema work can stay narrow and deterministic
- the repo preserves the pattern of contract first, schema second, adapters third

Tradeoffs:
- this step does not yet add Prisma schema or SQL migration artifacts
- review/approval/execution entities after feedback decisions remain outside durable relational coverage

## Explicitly not included
- Prisma schema or migration changes
- repository mappers or adapter implementations
- approval/review/execution durable slices
- runtime ingestion, evaluation, aggregation, or UI work

## Follow-up
- implement the adapter-backed relational repository and concrete Prisma adapter for `research_feedback_decision`
