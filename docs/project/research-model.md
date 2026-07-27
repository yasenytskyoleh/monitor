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
- time-based mode only (`time_based`)
- explicit start reference rule (`signal_detected_at`)
- explicit duration and/or end timestamps

### EvaluationResult
Outcome of evaluating one candidate in one window.

Includes:
- evaluation status
- outcome summary
- minimum metrics bundle
- evaluated timestamp + limitations

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

### SetupAggregateResult
Aggregated evidence summary for one setup under one aggregation scope.

Purpose:
- group multiple `EvaluationResult` records
- produce first minimum aggregate metrics
- expose research limitations explicitly

### SetupComparison
Descriptive comparison object for two or more setup aggregates under aligned scope semantics.

Purpose:
- compare setup evidence in the same evaluation/symbol/time context
- avoid vague cross-scope comparisons

## Measurability requirements
- setup conditions must be machine-readable (`field`, `operator`, `value`)
- invalidation assumptions must be explicit text entries
- signal candidates must include evidence references
- evaluation windows must expose explicit mode/start rule/duration semantics
- evaluation results must expose minimum comparable outcome metrics
- aggregation must include explicit scope semantics before metrics are interpreted
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
- `packages/domain-model/src/evaluation/*`
- `packages/domain-model/src/research/*`
- `packages/domain-model/src/research-hypothesis.ts`
- `packages/domain-model/src/research-run.ts`

Lifecycle writes are owned by `ResearchRunService`
(`packages/domain-model/src/services/research-run-service.ts`). It validates research context
and controls planned, running, and terminal transitions without taking on runtime scheduling.
