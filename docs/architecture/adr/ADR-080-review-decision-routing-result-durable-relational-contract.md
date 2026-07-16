# ADR-080: Review Decision Routing Result Durable Relational Contract

## Status
Accepted

## Context
The shared Prisma-backed repository bundle and opt-in real-Postgres integration flow already span the implemented product chain through `setup_revision_activation_record`.

`ReviewDecisionRoutingResult` is the remaining downstream execution-handoff record between a resolved `research_review_decision` and a `routed_action_execution_envelope`. It already has a domain contract and in-memory repository, but was absent from the first-class persisted-entity catalog and had no durable relational record contract.

Without a durable contract, a future schema for routing results would have to infer how to preserve the terminal routing status, downstream target, command type, and routing diagnostics.

## Decision
Select `review_decision_routing_result` as the next downstream execution/mutation persistence slice and add its logical durable relational contract.

The contract includes:
- standard product-domain metadata, lifecycle, and optimistic-version fields
- the routed research-review-decision and setup-family references
- optional setup-revision, authorized-next-action, and downstream-target context represented as nullable durable fields
- routable terminal status (`routed` or `no_action`), decision outcome, downstream command type, and routing timestamp
- nullable diagnostic reason and persisted warning messages for durable routing records

The entity is registered as first-class product persistence. A service-owned write path is deferred until the repository rollout so this contract step does not claim behavior that does not exist yet.

## Consequences
Positive:
- the remaining execution-handoff record is explicitly selected instead of inferred from the later execution envelope
- schema work can preserve both persistable routed and no-action outcomes without inventing a later representation
- the project maintains contract-first persistence rollout discipline

Tradeoffs:
- this step does not add a Prisma model, SQL migration, adapter, mapper, or repository implementation
- rejected routing results remain transient because they have no stable routing id or complete routing context
- routing-service validation and action-selection rules remain service-owned

## Explicitly not included
- Prisma schema or migration changes
- changes to review-decision routing behavior
- relational adapter or repository implementation
- a service-owned routing-result write path
- shared-bundle or real-Postgres integration extension
- runtime execution engines, exchange ingestion, or UI

## Follow-up
- define the Prisma physical schema and migration for `review_decision_routing_result`
