# ADR-084: Implemented Product Review Decision Routing Result Composition

## Status
Accepted

## Context
`review_decision_routing_result` has durable relational parity, but the shared implemented-product Prisma bundle stopped before routing results. Consumers using the shared boundary therefore could not persist the durable handoff between a review decision and a downstream execution envelope.

## Decision
Extend the shared implemented-product repository composition and shared Prisma-backed bundle through `review_decision_routing_result`.

This adds the routing-result adapter to the bundle, exposes its repository from the shared composition, and verifies the in-memory end-to-end chain creates a routing result before its execution envelope.

## Consequences
Positive:
- the shared bundle now carries the durable review-decision handoff through routing results
- callers receive one repository boundary for review decisions, routing results, and execution envelopes

Tradeoffs:
- opt-in real-Postgres integration still stops before `review_decision_routing_result`

## Explicitly not included
- real-Postgres integration coverage through routing results
- routing-service write-path changes
- runtime execution engines

## Follow-up
- extend the opt-in real-Postgres integration flow through `review_decision_routing_result`
