# ADR-051: Routed Action Execution Envelope Prisma Schema Layout

## Status
Accepted

## Context
The repo already had:
- the logical durable relational contract for `routed_action_execution_envelope`
- committed physical schema artifacts through `research_review_decision`
- one shared Prisma-backed repository bundle plus one real-Postgres integration path through `research_review_decision`

The next missing layer for `routed_action_execution_envelope` was a committed physical schema layout that future adapters can target directly.

Without this step, adapter/repository implementation would still be blocked by unresolved decisions about:
- whether the source review decision should be a real physical FK
- how the executable target/command mapping should be enforced at the DB boundary
- how structured target, route, and payload snapshots should be stored without flattening the envelope into later execution/mutation tables

## Decision
Commit the Prisma physical schema and SQL migration for `routed_action_execution_envelope`.

The layout uses:
- PostgreSQL under `product_domain`
- Prisma schema artifacts as the canonical physical description
- explicit SQL migration artifacts for the execution-envelope slice
- a real FK to `research_review_decision`
- JSONB storage for the structured target refs, route metadata snapshot, and execution payload snapshot
- DB-level checks for executable target/command alignment, required target context, and prepared timestamp consistency

## Consequences
Positive:
- the execution-envelope slice now has committed physical storage artifacts
- adapter/repository implementation can target a concrete schema instead of inferred storage
- current envelope-preparation semantics are enforced consistently at the physical boundary

Tradeoffs:
- `source_routing_result_id` remains a service-owned/runtime-owned reference rather than a relational FK
- target refs remain structured JSONB snapshots rather than being decomposed into several optional FK columns in this step
- repository adapters for this entity are still deferred in this step

## Explicitly not included
- repository adapter contracts
- domain/durable mappers
- adapter-backed relational repositories
- concrete Prisma adapter wiring
- shared implemented-product bundle extension beyond `research_review_decision`

## Follow-up
- add the repository adapter contract for `routed_action_execution_envelope`
