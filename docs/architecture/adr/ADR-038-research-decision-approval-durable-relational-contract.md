# ADR-038: Research Decision Approval Durable Relational Contract

## Status
Accepted

## Context
The repo already has:
- one shared durable relational bundle for the implemented research chain through `research_feedback_decision`
- `ResearchDecisionApproval` in the domain model
- implemented in-memory persistence and service-owned write paths for `ResearchDecisionApproval`

The next downstream service-owned entity is `research_decision_approval`.

Without an explicit durable relational contract, physical schema work for the approval slice would start from storage guesses instead of a defined boundary contract.

## Decision
Add a logical durable relational contract for `research_decision_approval`.

The contract includes:
- one durable record type
- required feedback-decision and setup references
- reviewer identity and review timestamp fields
- approval outcome and status fields
- nullable reviewer notes and nullable authorized-next-action fields
- standard product-domain metadata and optimistic version semantics

## Consequences
Positive:
- the approval slice now has an explicit logical storage contract
- physical schema work can stay narrow and deterministic
- the repo preserves the pattern of contract first, schema second, adapters third

Tradeoffs:
- this step does not yet add Prisma schema or SQL migration artifacts
- approval repository/runtime parity is still incomplete until the physical schema and adapter work lands

## Explicitly not included
- Prisma schema or migration changes
- repository mappers or adapter implementations
- later review/execution durable slices
- runtime review/execution engines
- UI work

## Follow-up
- commit the Prisma physical schema and SQL migration for `research_decision_approval`
