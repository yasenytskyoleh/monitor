# ADR-083: Review Decision Routing Result Adapter-Backed Relational Repositories

## Status
Accepted

## Context
The routing-result slice has a committed physical schema and relational adapter contract, but domain-facing reads and writes still used only the legacy in-memory repository.

## Decision
Add durable mappers, an adapter-backed `ReviewDecisionRoutingResultRepository`, composition helper, and Prisma adapter/client factory.

Only `routed` and `no_action` outcomes can dehydrate to a durable record. Their routing timestamp supplies immutable creation and update timestamps. Prisma validates the physical `research_review_decision` reference before create and maps duplicate and foreign-key failures to the established repository errors.

## Consequences
Positive:
- routing results can use the same relational repository pattern as adjacent downstream slices
- transient routing outcomes cannot accidentally cross the durable boundary
- Prisma behavior has fake-client parity coverage without changing service write ownership

Tradeoffs:
- routing-result persistence is intentionally create-only and derives record timestamps from the routed timestamp

## Explicitly not included
- service-owned routing-result writes
- shared implemented-product bundle extension
- real-Postgres integration coverage

## Follow-up
- extend shared composition and opt-in integration coverage through `review_decision_routing_result`
