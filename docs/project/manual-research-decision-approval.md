# Manual research decision approval runtime

`@monitor/research-decision-approval` is a process-local runtime that records one explicit
reviewer outcome for a proposed setup-feedback decision.

## Boundary

`recordManualApproval` requires the feedback-decision ID, its setup ID, reviewer identity, review
timestamp, and an explicit `approved`, `rejected`, or `needs_changes` outcome. It does not infer
or generate review outcomes. The runtime prevalidates the persisted decision reference, setup
match, and `proposed` lifecycle state before it forwards the command to
`createResearchDecisionApprovalHandoff`.

The domain handoff remains authoritative for durable approval and feedback-decision status writes.
An approved decision can authorize a later action, but this runtime neither executes nor schedules
that action.

## Traceability and retries

The runtime records `manual_curation` metadata using the feedback-decision ID as its trace ID.
Validation and lifecycle rejections occur before a handoff write. Domain outcomes are returned
unchanged; unexpected repository or handoff failures are explicit retryable failures.

## Out of scope

No user interface, reviewer authentication, authorization policy, automatic approval, lifecycle
mutation, refinement creation, review-decision routing, scheduling, event persistence, alerting,
or trading is included.
