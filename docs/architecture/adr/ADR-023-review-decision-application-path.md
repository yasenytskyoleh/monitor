# ADR-023: Review Decision Application Path

## Status
Accepted

## Context
After ADR-022, Monitor can assemble deterministic research review packets.

The missing boundary is how a reviewer resolves a packet into an explicit product-domain outcome that is auditable and safe.

## Decision
Introduce a first review-decision application model:
- command: `ApplyResearchReviewDecisionCommand`
- record: `ResearchReviewDecision`
- outcomes: `accepted | rejected | revise`
- result envelope: `ResearchReviewDecisionResult`
- service: `ResearchReviewDecisionService.applyDecision(...)`

Decision application is explicit and separate from packet assembly.

## Outcome semantics
- `accepted`:
  - records an explicit accepted outcome
  - may carry authorized next action (`confirm_no_change`, activation/lifecycle/refinement follow-up intents)
- `rejected`:
  - records explicit rejection outcome
  - does not authorize downstream follow-up
- `revise`:
  - records explicit revise outcome
  - defaults authorized next action to `prepare_refinement_follow_up`
  - does not directly mutate setup lifecycle

## State update boundary
This slice updates product-domain state by creating durable `ResearchReviewDecision` records.

It does not automatically execute activation, lifecycle mutation, or refinement pipelines.

## Validation and linkage rules
- packet id, setup family id, reviewer identity, reviewed timestamp are required
- packet must exist via explicit lookup
- packet family/revision/hypothesis scope must match command
- packets in `failed` state are not eligible
- `accepted` is blocked for `insufficient_context` packets
- authorized-next-action must be explicit and outcome-compatible

## Determinism boundary
In this slice:
- no auto-resolution of packets
- no hidden policy engine
- no autonomous downstream mutation
- no UI/workflow inbox requirements

## Failure policy
- missing required fields -> `rejected_validation`
- missing packet / linkage mismatch -> `rejected_linkage`
- ineligible packet lifecycle state -> `rejected_lifecycle`
- unexpected write failure -> `failed`

## Consequences
Positive:
- packet review outcomes become explicit, durable, and auditable
- accepted/rejected/revise intent is structured for downstream controlled follow-up
- review intent remains decoupled from mutation execution

Trade-offs:
- no workflow inbox or assignment model
- no automatic downstream action execution
- packet lookup storage semantics remain thin and implementation-defined

## Explicitly postponed
- review inbox/UI
- reviewer assignment and notification workflow
- auto-execution of authorized next actions
- autonomous review or policy optimization logic
