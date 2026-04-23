# Research Review Packet Model

## Purpose
Define the first review-ready snapshot bundle for Monitor decision support.

This model packages explicit artifacts from revision, evidence, recommendation, and approval flows into one structured object for human review.

## Command contract
Source:
- `packages/domain-model/src/query/build-research-review-packet-command.ts`

Fields:
- `setupFamilyId`
- optional `setupRevisionId`
- optional `researchHypothesisId`
- optional `researchFeedbackDecisionId`
- optional `researchDecisionApprovalId`
- optional `impactSummaryId`
- optional `impactSummarySnapshot`
- `builtAt`
- optional `scopeDescriptor`
- optional `originRunId`

## Packet contract
Source:
- `packages/domain-model/src/query/research-review-packet.ts`

Packet includes:
- identity context (`setupFamilyId`, optional revision/hypothesis ids)
- revision lineage context
- optional snapshots:
  - impact summary
  - hypothesis
  - recommendation
  - approval
- explicit included and requested artifact refs
- explicit warnings
- packet status
- created timestamp

## Packet/result statuses
Sources:
- `packages/domain-model/src/query/research-review-packet-status.ts`
- `packages/domain-model/src/query/research-review-packet-result.ts`

Packet statuses:
- `complete`
- `partial`
- `insufficient_context`
- `failed`

Result statuses:
- `complete`
- `partial`
- `insufficient_context`
- `rejected`
- `failed`

## Coordination path
1. Build command is created.
2. Setup family/revision context is resolved.
3. Linked impact summary/hypothesis/recommendation/approval snapshots are resolved.
4. Included refs and warnings are assembled.
5. Completeness is assessed.
6. Structured review packet result is returned.

## Deterministic constraints
- no LLM narrative generation at this boundary
- no hidden ranking or recommendation logic
- packet assembly uses explicit linked artifacts only
- packet is snapshot-based, not live mutable view
