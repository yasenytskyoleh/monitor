# Setup Comparison Model

## Purpose
Define how setup aggregates can be compared within aligned scopes, without introducing ranking engines yet.

## Comparison contract
Contract:
- `SetupComparison` (`packages/domain-model/src/research/setup-comparison.ts`)

Comparison contains:
- compared setup ids
- comparison scope
- metric snapshots per setup aggregate
- compared timestamp
- limitations and notes

## Scope alignment
Comparison scope is explicit and shared across compared setups:
- same evaluation window id (or explicit mixed-window mode via `null`)
- same symbol scope
- same time range
- optional shared research run or hypothesis context

This provides deterministic context for comparison and avoids vague cross-scope comparisons.

## Metric snapshot direction
Each setup snapshot should carry the first minimum comparable fields:
- total candidates
- completed/invalidated counts
- average percentage move
- average absolute move
- average final outcome score
- average max favorable excursion
- average max adverse excursion
- simple hit-rate placeholder

## Explicitly postponed
- automatic setup ranking
- weighted multi-metric scoring
- statistical significance testing
- optimization/recommendation engines
