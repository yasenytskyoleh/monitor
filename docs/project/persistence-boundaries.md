# Persistence Boundaries

## Purpose
Define what is persisted now vs later, identity expectations, and lifecycle semantics across storage boundaries.

## First-class persisted product entities
- `monitored_symbol`
- `setup_definition`
- `signal_candidate`
- `evaluation_result`
- `research_hypothesis`
- `setup_aggregate_result`

These entity types are defined in:
- `packages/domain-model/src/storage/storage-boundary.ts`
- `packages/domain-model/src/storage/persisted-entity.ts`

## Ephemeral or derived concepts (current)
- `detection_input_transient`
- `setup_comparison_view`
- `orchestration_task_envelope`

These remain non-source-of-truth in this slice.

## Identity model
Product records are identified by:
- storage boundary (`product_domain`)
- entity type
- stable entity id
- explicit version
- optional parent/related ids for traceability

Identity contracts:
- `EntityIdentity`
- `ProductEntityIdentity`
- `RuntimeEvidenceIdentity`

## Persistence timing semantics (first direction)
- `SetupDefinition`:
  created when authored, updated on revision/status changes, archive-capable
- `SignalCandidate`:
  created on detection, updated through lifecycle, archive-capable
- `EvaluationResult`:
  created after evaluation closes/invalidates, updated before finalization, archive-capable
- `SetupAggregateResult`:
  created on aggregation compute, may be recomputed under versioned identity, archive-capable
- runtime `run.json` and related files:
  orchestration evidence only, not product-domain records

## Orchestration-to-product linkage
Allowed:
- product record metadata can reference `originRunId` and `originTransitionId`
- trace ids can link product writes to orchestration executions

Not allowed:
- treating runtime artifact files as product storage
- storing product entities only inside `runtime/runs/*`

## Mutability guidance
- identity fields are stable after creation
- mutable fields are entity-specific and tracked through `updatedAtUtc`
- lifecycle status supports active/archive behavior for first persisted entities
