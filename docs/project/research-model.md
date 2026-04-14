# Research Model

## Purpose
This document formalizes setup/signal/evaluation concepts so they can later be stored, tested, and compared consistently.

## Core definitions

### SetupDefinition
A reusable research setup specification.

Must include:
- stable id and name
- measurable entry conditions
- evaluation assumptions
- invalidation assumptions
- lifecycle status (`draft`, `active`, `archived`)

### SignalCandidate
A concrete candidate event tied to:
- exactly one `SetupDefinition`
- exactly one `MonitoredSymbol`
- one detection timestamp

Signal lifecycle status:
- `detected`
- `under_review`
- `evaluated`
- `discarded`

### EvaluationWindow
A bounded horizon for evaluating a signal candidate.

Current first-slice model:
- time-based horizons only (`minutes`, `hours`, `days`)
- explicit start/end timestamps

### EvaluationResult
Outcome of evaluating one candidate in one window.

Includes:
- explicit outcome class
- return percentage placeholder
- max favorable/adverse excursion placeholders
- evaluated timestamp

### ResearchHypothesis
A testable research statement linked to setup definitions.

Must include:
- hypothesis statement
- success criteria list
- lifecycle status (`draft`, `active`, `paused`, `closed`)

### ResearchRun
A bounded run instance for hypothesis execution tracking.

Current purpose:
- tie hypothesis + setup + candidate ids together
- track run lifecycle and generated evaluation result ids

## Measurability requirements
- setup conditions must be machine-readable (`field`, `operator`, `value`)
- invalidation assumptions must be explicit text entries
- signal candidates must include evidence references
- evaluation windows must be explicit horizon values/units
- evaluation results must expose comparable numeric placeholders where available
- future setup detection inputs are expected to come from `NormalizedMarketEvent` contracts

## Postponed decisions
- advanced statistics catalog
- benchmark definitions
- confidence interval computation
- exchange-specific normalization fields
- production-grade evidence ingestion

## Contract source
Reference implementation contracts for this document:
- `packages/domain-model/src/setup-definition.ts`
- `packages/domain-model/src/signal-candidate.ts`
- `packages/domain-model/src/evaluation.ts`
- `packages/domain-model/src/research-hypothesis.ts`
- `packages/domain-model/src/research-run.ts`
