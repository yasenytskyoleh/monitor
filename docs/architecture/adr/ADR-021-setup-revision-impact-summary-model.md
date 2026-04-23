# ADR-021: Setup Revision Impact Summary Model

## Status
Accepted

## Context
After ADR-020, Monitor can compare baseline vs target setup revisions with explicit metric deltas.

The next missing boundary is a stable summary layer that turns comparison output into a concise, deterministic interpretation artifact for humans/services.

## Decision
Introduce a read-model summary contract that consumes explicit comparison output:
- input: `BuildSetupRevisionImpactSummaryCommand`
- summary object: `SetupRevisionImpactSummary`
- envelope: `RevisionImpactSummaryResult`
- service entrypoint: `SetupComparisonSummaryService.buildImpactSummary(...)`

This summary is descriptive only.
It does not rank revisions, recommend activation, or auto-mutate setup lifecycle.

## First impact classifications
- `improved`
- `degraded`
- `mixed`
- `inconclusive`

Classifications are derived from explicit metric deltas and explicit evidence sufficiency semantics.

## First evidence sufficiency semantics
- `sufficient`
- `limited`
- `insufficient`

First-version thresholds:
- `insufficient` when comparison already reports insufficient evidence or one side has fewer than 3 completed evaluations
- `limited` when minimum completed evaluations is 3-9
- `sufficient` when minimum completed evaluations is 10+

## First key metric change set
Impact summary exposes these deltas:
- completed evaluations
- positive outcome rate
- average percentage move
- average final outcome
- average max favorable excursion
- average max adverse excursion

## Determinism boundary
In this slice:
- no freeform LLM summarization
- no weighted scoring/ranking engine
- no policy engine for activation/refinement actions
- no hidden fallback from missing comparison id lookup

Summary generation is deterministic from explicit comparison payloads and explicit rules.

## Failure policy
- missing setup family / baseline / target / summarized timestamp -> `rejected`
- missing comparison payload in first version -> `rejected`
- selector mismatch between command and comparison payload -> `rejected`
- ambiguous summary scope mismatch -> `rejected`
- runtime/query error while building summary -> `failed`

Insufficient evidence does not fail summary generation.
It yields a summarized artifact with `evidenceSufficiency=insufficient` and typically `impactClassification=inconclusive`.

## Consequences
Positive:
- comparison output now has a stable interpretation layer
- summary artifact is human-readable and service-consumable
- impact interpretation stays auditable with explicit warnings

Trade-offs:
- no persisted `revisionComparisonId` lookup in first slice
- no significance/confidence model
- no recommendation or optimization logic

## Explicitly postponed
- ranking/optimization engines
- activation recommendation model
- significance/confidence testing
- dashboard/reporting layers
