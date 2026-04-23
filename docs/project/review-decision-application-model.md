# Review Decision Application Model

## Purpose
Define the first explicit path for resolving a research review packet into an auditable review outcome.

This model records reviewer intent.
It does not execute downstream lifecycle/refinement/activation automatically.

## Command contract
Source:
- `packages/domain-model/src/review/apply-research-review-decision-command.ts`

Fields:
- `researchReviewPacketId`
- `setupFamilyId`
- optional `setupRevisionId`
- optional `researchHypothesisId`
- `reviewedBy`
- `reviewedAt`
- `decisionOutcome` (`accepted | rejected | revise`)
- optional `reviewerNotes`
- optional `authorizedNextAction`
- optional `originRunId`

## Record contract
Source:
- `packages/domain-model/src/review/research-review-decision.ts`

Record includes:
- review-packet linkage
- setup family/revision/hypothesis context
- reviewer identity and timestamp
- explicit decision outcome
- explicit authorized-next-action (when applicable)
- decision status and audit timestamps

## Service boundary
Source:
- `packages/domain-model/src/review/research-review-decision-service.ts`

Service:
- validates required fields and outcome semantics
- resolves packet identity and scope
- applies eligibility checks
- creates durable review-decision record
- returns structured result status

## Result contract
Source:
- `packages/domain-model/src/review/research-review-decision-result.ts`

Result statuses:
- `recorded`
- `rejected_validation`
- `rejected_linkage`
- `rejected_lifecycle`
- `failed`

## Manual-first constraints
- no automatic packet resolution
- no implicit next actions
- no automatic lifecycle mutation/refinement execution from packet existence alone
- accepted/rejected/revise are explicit and auditable
