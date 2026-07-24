# ADR-085: Implemented Product Review Decision Routing Result Integration Coverage

## Status
Accepted

## Context
The shared implemented-product repository bundle now includes `review_decision_routing_result`, but the opt-in real-Postgres integration flow did not apply its migration or exercise its persistence and foreign-key behavior.

## Decision
Extend the real-Postgres full-chain integration harness through `review_decision_routing_result`.

The flow now applies the routing-result migration, persists a routing result after its review decision and before its execution envelope, verifies repository and Prisma reads, and checks a missing source review decision maps to `invalid_reference`.

## Consequences
Positive:
- the shared bundle has real-database coverage through the durable review-decision handoff
- migration ordering and source-review-decision foreign-key behavior are exercised together

Tradeoffs:
- execution envelopes retain their existing source-review-decision foreign key; this step does not add a physical routing-result foreign key

## Explicitly not included
- routing-service write-path changes
- additional downstream durable slices
- runtime execution engines

## Follow-up
- select the next later downstream durable slice
