# Approved refinement follow-up runtime

`@monitor/setup-refinement` creates one auditable refinement request from a persisted approval
that explicitly authorizes `refine_definition`.

It requires a caller-provided owner, timestamp, rationale, and requested changes. The runtime
does not modify the setup definition, create a revision, activate a revision, or automate review.
It delegates durable linkage and duplicate handling to the existing approved-refinement handoff.

The approval ID is retained as the trace ID. Missing, invalid, non-approved, or differently
authorized approvals are rejected before a handoff write; unexpected failures remain retryable.
