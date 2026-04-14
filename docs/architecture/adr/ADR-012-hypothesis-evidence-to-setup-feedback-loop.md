# ADR-012: Hypothesis-Evidence to Setup Feedback Loop

## Status
Accepted

## Context
After ADR-011, Monitor can update `ResearchHypothesis` evidence state from completed aggregate evidence.

The next missing boundary is how updated evidence produces explicit research decisions for setup lifecycle/refinement review.

Without this boundary, the research loop remains open because evidence does not yet produce explicit setup-action recommendations.

## Decision
Introduce a narrow runtime handoff contract for evidence-to-feedback decisions:
- input: `HypothesisFeedbackDecisionTrigger`
- resolved command: `ReviewSetupFromEvidenceCommand`
- output: `FeedbackDecisionResult`
- coordinator: `createHypothesisEvidenceToSetupFeedbackHandoff`

Service decision boundary:
- `ResearchService.reviewSetupFromEvidence(...)` owns recommendation semantics and decision-record creation.
- runtime handoff coordinates deterministic validation, linkage checks, and explicit failure mapping.

## First feedback decision record
Introduce `ResearchFeedbackDecision` as the first durable feedback-loop object.

Record fields include:
- decision identity
- setup definition id
- research hypothesis id
- optional aggregate result linkage
- evidence status
- recommended action
- rationale summary
- decision status (`proposed`, `reviewed`, `accepted`, `rejected`)
- manual-review flag and optional reviewer metadata placeholder
- created/updated timestamps

## First recommendation model
First recommendation outcomes:
- `keep_active`
- `refine_definition`
- `pause_setup`
- `archive_setup`
- `manual_review_required`

First deterministic rule:
- `supports` -> `keep_active`
- `inconclusive` -> `manual_review_required`
- `weakens` + hypothesis `draft` -> `refine_definition`
- `weakens` + hypothesis `active` -> `pause_setup`
- `weakens` + hypothesis `paused` -> `archive_setup`
- otherwise -> `manual_review_required`

## Manual vs automated boundary
Recommendation output is explicit, but setup mutation is not automatic in this version.

Allowed:
- create `ResearchFeedbackDecision`
- store recommendation and rationale
- require manual review before setup mutation

Not allowed in this ADR:
- automatic setup definition rewrite
- automatic setup archival
- automatic hypothesis closure

## Ownership boundary
Evidence side owns:
- aggregate metrics and evidence status correctness
- hypothesis evidence summary correctness

Research decision side owns:
- recommendation interpretation from evidence
- manual-review requirement semantics
- decision record creation and review-state progression

## Failure policy
- missing hypothesis/setup/aggregate references -> `rejected_validation`
- invalid evidence status or mismatched linkage -> `rejected_validation` / `rejected_linkage`
- decision-record persistence failure -> `failed` with retry warning

No retry worker or queue is introduced in this slice.

## Consequences
Positive:
- first explicit research feedback-loop boundary exists
- loop is closed with durable recommendation records
- manual-vs-automated safety boundary remains explicit

Trade-offs:
- first decision rule is intentionally minimal and heuristic
- decision outcomes are recommendation-only, not automated actions

## Explicitly postponed
- auto-refinement engine
- auto-archival engine
- auto-hypothesis lifecycle mutation
- reviewer UI/work queue
- batch feedback decision workers
