# Routed Action Execution Envelope

## Purpose
Define the first explicit artifact that packages routed downstream actions into execution-ready envelopes.

This model prepares command payloads and metadata.
It does not execute commands.

## Command contract
Source:
- `packages/domain-model/src/execution/build-routed-action-execution-envelope-command.ts`

Key fields:
- `reviewDecisionRoutingResultId`
- `researchReviewDecisionId`
- `downstreamActionTarget`
- `targetEntityRefs`
- `preparedBy`
- `preparedAt`
- optional `originRunId`
- optional `routeMetadataSnapshot`

## Envelope contract
Source:
- `packages/domain-model/src/execution/routed-action-execution-envelope.ts`

Envelope includes:
- envelope identity
- source routing/result identifiers
- action target and mapped command type
- target entity references
- route metadata snapshot
- typed execution payload snapshot
- execution status
- preparation audit metadata

## Preparation result contract
Source:
- `packages/domain-model/src/execution/routed-action-execution-result.ts`

Result statuses:
- `prepared`
- `no_envelope`
- `rejected_validation`
- `rejected_lifecycle`
- `failed`

## Preparation service
Source:
- `packages/domain-model/src/execution/downstream-action-execution-preparation-service.ts`

Service:
- resolves routing result by id
- validates target and mapping eligibility
- validates required target references
- maps route to downstream command snapshot
- creates durable execution envelope
- returns explicit no-envelope outcome for no-op routes
