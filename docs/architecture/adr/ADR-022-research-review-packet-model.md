# ADR-022: Research Review Packet Model

## Status
Accepted

## Context
After ADR-021, Monitor can produce explicit revision impact summaries from revision comparisons.

The next missing capability is a review-ready bundle that combines impact summary, evidence state, revision context, recommendation, and approval status into one explicit artifact for human review.

## Decision
Introduce a first research review packet read-model:
- input command: `BuildResearchReviewPacketCommand`
- packet model: `ResearchReviewPacket`
- packet statuses: `complete | partial | insufficient_context | failed`
- result envelope: `ResearchReviewPacketResult`
- service entrypoint: `ResearchReviewPacketService.buildReviewPacket(...)`

This packet is decision-support only.
It is not a decision engine, workflow runner, or dashboard.

## Minimum packet contents
First-version packet includes:
- setup family and optional setup revision identity
- revision status/version lineage context
- latest impact summary snapshot (if provided)
- hypothesis snapshot and evidence status (if available)
- recommendation snapshot (if available)
- approval snapshot (if available)
- explicit warnings/caveats
- completeness status

## Snapshot semantics
- packet assembly is point-in-time and explicit
- packet does not auto-refresh after creation
- packet keeps explicit included artifact refs and requested refs

## Assembly rules
- missing `setupFamilyId` -> `rejected`
- missing resolved revision/evidence context -> `insufficient_context`
- missing optional artifacts -> `partial` with warnings
- all required context resolved with no warnings -> `complete`
- unexpected assembly failure -> `failed`

## Determinism boundary
In this slice:
- no freeform LLM narrative generation
- no ranking/prioritization engine
- no autonomous recommendation/approval logic
- no hidden fallback to ambiguous artifact sources

## Consequences
Positive:
- review discussions can consume one structured packet object
- decision-support context is portable to future APIs/UI
- completeness and caveats remain explicit and auditable

Trade-offs:
- packet is thin and snapshot-only
- impact summary lookup by id is postponed (snapshot payload provided directly)

## Explicitly postponed
- dashboard/report UI
- packet inbox/workflow orchestration
- notification engine
- packet history/version timeline
- autonomous decision logic
