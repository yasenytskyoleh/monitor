# ADR-030: Signal/Evaluation Durable Relational Rollout

## Status
Accepted

## Context
The repo already had a proven durable relational pattern for:
- `setup_definition`
- `research_hypothesis`

That pattern included:
- logical durable record contracts
- committed Prisma schema and migration artifacts
- adapter-backed repositories
- concrete Prisma adapter/runtime wiring
- shared repository composition
- opt-in real-database integration coverage

The next missing product-domain step was extending that same pattern to:
- `signal_candidate`
- `evaluation_result`

These two entities are upstream dependencies for later aggregate persistence, so keeping them only in in-memory repositories would block the next product-facing slice.

## Decision
Implement the second durable relational slice for:
- `signal_candidate`
- `evaluation_result`

including:
- durable record contracts
- physical Prisma schema and migration artifacts
- in-memory adapter harness
- adapter-backed relational repositories
- concrete Prisma adapter
- shared-client real-Postgres integration coverage

This slice keeps `setup_revision_id`, `monitored_symbol_id`, `detection_hit_id`, and `evaluation_window_id` as scalar references rather than inventing additional relational tables prematurely.

## Consequences
Positive:
- four service-owned product entities now have durable relational parity:
  - `setup_definition`
  - `research_hypothesis`
  - `signal_candidate`
  - `evaluation_result`
- `setup_aggregate_result` can now be the next bounded durable-persistence target
- the relational rollout pattern is now validated across both setup/research and signal/evaluation flows

Tradeoffs:
- some references remain scalar-only until later slices define their own durable storage
- repository composition is still slice-oriented rather than a single all-entities product bundle

## Explicitly not included
- runtime detection/evaluation/aggregation engines
- exchange ingestion
- UI work
- autonomous analytics or trading logic
- durable rollout for `setup_aggregate_result`

## Follow-up
- `setup_aggregate_result` durable relational persistence is now implemented through `ADR-031` and `ADR-032`
- broader shared repository composition across the implemented durable entities is the next persistence step
