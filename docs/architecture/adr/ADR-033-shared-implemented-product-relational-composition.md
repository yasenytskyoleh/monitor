# ADR-033: Shared Implemented Product Relational Composition

## Status
Accepted

## Context
The repo already had durable relational parity for the current core research chain:
- `setup_definition`
- `research_hypothesis`
- `signal_candidate`
- `evaluation_result`
- `setup_aggregate_result`

Each slice had its own adapter/repository/client composition path, but the broader product-domain boundary was still fragmented across slice-local factories.

That meant the repo still lacked one shared proof that the current implemented product entities could run together through a single Prisma-backed repository bundle.

## Decision
Add one shared repository composition and one shared Prisma-backed bundle for the implemented durable product entities.

This includes:
- a combined repository composition
- a combined Prisma-backed bundle factory
- an end-to-end integration test across setup -> candidate -> evaluation -> aggregate

## Consequences
Positive:
- the current implemented product chain now has one coherent shared persistence bundle
- end-to-end composition is proven without adding new persistence rules
- the next durable slice can move downstream into review/governance entities

Tradeoffs:
- the shared bundle currently stops at the core research chain
- review/approval/execution entities still remain in-memory only

## Explicitly not included
- new runtime ingestion or aggregation jobs
- new review/governance durable schemas
- trading or execution behavior
- UI work

## Follow-up
- extend the shared implemented-product repository bundle and end-to-end real-Postgres integration path through `research_feedback_decision`
