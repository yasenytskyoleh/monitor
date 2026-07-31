# Hypothesis evidence to setup-feedback runtime

`@monitor/setup-feedback` is a provider-neutral, process-local runtime for producing one
reviewable setup-feedback decision from persisted research-hypothesis evidence.

## Boundary

`reviewFromHypothesis` requires an explicit research-hypothesis ID, setup-definition ID, and
trigger timestamp. The caller supplies the setup ID because a hypothesis can link to more than
one setup. The runtime resolves the hypothesis, requires its persisted evidence status, and
forwards that status, evidence summary, and latest aggregate reference (when present) to
`createHypothesisEvidenceToSetupFeedbackHandoff`.

The domain handoff remains authoritative for linkage validation, recommendation interpretation,
and decision persistence. A completed review records a proposed decision that still requires
human review.

## Traceability and retry behavior

Metadata uses the existing `research_aggregation_pipeline` source. The latest aggregate ID is used
as the trace ID when present; otherwise the hypothesis ID is used. Invalid input,
missing hypotheses, and hypotheses without persisted evidence are rejected before a handoff
write. Handoff validation and linkage outcomes are returned unchanged. Unexpected lookup or
handoff failures return an explicit retryable failure.

## Out of scope

This package does not update setup lifecycle, approve or reject decisions, create refinement
requests, schedule work, batch hypotheses, persist provider payloads, score evidence, alert, or
trade. It expects prior evidence updates to have persisted the hypothesis state and has no
checkpoint or restart behavior of its own.
