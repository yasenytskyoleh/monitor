# ADR-081: Review Decision Routing Result Prisma Schema Layout

## Status
Accepted

## Context
`review_decision_routing_result` now has a durable relational contract for persistable `routed` and `no_action` outcomes, but it had no committed physical representation in the product-domain Postgres schema.

Without a schema and migration, later adapters could not persist the stable handoff record between `research_review_decision` and `routed_action_execution_envelope`.

## Decision
Add a Prisma model and SQL migration for `review_decision_routing_result`.

The physical schema includes:
- a dedicated routable-status enum limited to `routed` and `no_action`
- explicit source-review-decision, setup-family, optional setup-revision, outcome, action, target, command-type, timestamp, reason, and warning fields
- a foreign key to `research_review_decision`
- query indexes for source review decision, setup-family/timestamp, and routing status
- database checks for version, required identifier text, optional text hygiene, warning-array shape, temporal ordering, and lifecycle/archive consistency

## Consequences
Positive:
- durable routing results now have a committed Prisma and Postgres storage boundary
- later repository work can query routing records by review decision or setup family without reconstructing them from execution envelopes
- the schema preserves only outcomes that have stable routing ids and complete routing context

Tradeoffs:
- the schema intentionally does not encode routing-policy decisions, outcome/action combinations, or setup-family/revision lineage rules; those remain service-owned
- no relational adapter or repository implementation is included

## Explicitly not included
- changes to routing behavior or service-owned write paths
- adapter, mapper, repository, or Prisma-adapter implementation
- shared implemented-product bundle or integration extension
- runtime execution engines, exchange ingestion, or UI

## Follow-up
- define the relational adapter contract for `review_decision_routing_result`

