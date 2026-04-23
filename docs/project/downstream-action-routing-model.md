# Downstream Action Routing Model

## Purpose
Define the first deterministic routing layer from recorded review decisions into explicit downstream action families.

This slice routes intent only.
It does not execute downstream actions.

## Routing command contract
Source:
- `packages/domain-model/src/review/route-accepted-review-decision-command.ts`

Fields:
- `researchReviewDecisionId`
- `setupFamilyId`
- optional `setupRevisionId`
- `decisionOutcome`
- optional `authorizedNextAction`
- `routedAt`
- optional `originRunId`

## Routing result contract
Sources:
- `packages/domain-model/src/review/downstream-action-target.ts`
- `packages/domain-model/src/review/review-decision-route-status.ts`
- `packages/domain-model/src/review/review-decision-routing-result.ts`

Result includes:
- routing id
- review decision id and setup context
- decision outcome and authorized action
- selected route target
- mapped downstream command family type
- route status and warnings/reason

## Routing service boundary
Source:
- `packages/domain-model/src/review/review-decision-routing-service.ts`

Service:
- loads recorded review decision
- validates scope and outcome/action consistency
- maps to one explicit route target
- returns route result artifact for downstream consumers

## Manual-first constraints
- routing is separate from review-decision recording
- routing is separate from execution
- rejected decisions do not produce executable routes
- revise decisions can only route to refinement follow-up
- no hidden routing heuristics
