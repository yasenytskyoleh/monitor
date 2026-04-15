# Runtime Handoff Model

## Purpose
Define the first runtime boundary between monitoring/detection output and product-domain persistence for signal candidate creation.

This slice defines contracts and coordination only.
It does not implement the live monitoring loop or full detection runtime engine.

## Boundary definition
Detection side produces a structured detection hit command.
Product side decides whether/how that command becomes a persisted `SignalCandidate`.

Detection side owns:
- normalized event observation
- deterministic rule evaluation
- detection-hit payload production

Product side owns:
- reference validation
- duplicate policy enforcement
- candidate persistence
- candidate lifecycle ownership

## First handoff command
Contract:
- `DetectionToCandidateCommand`
- `packages/domain-model/src/runtime-handoff/detection-to-candidate-command.ts`

Minimum fields:
- `setupDefinitionId`
- `monitoredSymbolId`
- `detectedAt`
- optional `detectionHitId`
- `evidenceSummary`
- optional `originRunId`
- optional source metadata
- optional `candidateId`

## First handoff result
Contract:
- `RuntimeHandoffResult`
- `packages/domain-model/src/runtime-handoff/runtime-handoff-result.ts`

Statuses:
- `created`
- `rejected_validation`
- `rejected_duplicate`
- `failed`

## First coordination path
1. normalized monitoring event exists
2. detection rule produces structured hit payload
3. handoff command created (`DetectionToCandidateCommand`)
4. product handoff coordinator validates command
5. `SignalCandidateService.createSignalCandidate` is called
6. explicit handoff result is returned

Coordinator:
- `createSignalCandidateFromDetectionHandoff`
- `packages/domain-model/src/runtime-handoff/signal-candidate-from-detection.ts`

## Determinism rule
- detection side remains deterministic and rule-based
- handoff payload is explicit and structured
- no freeform LLM judgment at this boundary
- no hidden candidate creation logic

## Failure behavior
Failure cases:
- invalid command shape -> `rejected_validation`
- missing setup definition -> `rejected_validation`
- missing monitored symbol -> `rejected_validation`
- duplicate detection-hit policy hit -> `rejected_duplicate`
- unexpected service/runtime error -> `failed` + retry warning

No distributed transactions are introduced in this slice.

## Candidate-to-evaluation trigger boundary
Second runtime handoff in this phase:
- from persisted `SignalCandidate` to evaluation initiation
- through explicit `SignalCandidateEvaluationTrigger` payload

Contracts:
- `packages/domain-model/src/runtime-handoff/signal-candidate-evaluation-trigger.ts`
- `packages/domain-model/src/runtime-handoff/start-evaluation-command.ts`
- `packages/domain-model/src/runtime-handoff/evaluation-trigger-result.ts`
- `packages/domain-model/src/runtime-handoff/signal-candidate-to-evaluation.ts`

This boundary is deterministic and service-driven:
- validates candidate lifecycle eligibility
- resolves evaluation window id explicitly
- initializes pending evaluation result and starts evaluation
- returns explicit trigger result statuses

## Evaluation-to-aggregation refresh boundary
Third runtime handoff in this phase:
- from completed `EvaluationResult` to aggregate evidence refresh
- through explicit `EvaluationAggregationRefreshTrigger` payload

Contracts:
- `packages/domain-model/src/runtime-handoff/evaluation-aggregation-refresh-trigger.ts`
- `packages/domain-model/src/runtime-handoff/refresh-aggregate-from-evaluation-command.ts`
- `packages/domain-model/src/runtime-handoff/aggregation-refresh-result.ts`
- `packages/domain-model/src/runtime-handoff/evaluation-to-aggregation-refresh.ts`

This boundary is deterministic and service-driven:
- accepts refresh only from completed evaluation results
- resolves aggregation scope explicitly
- applies explicit create-vs-recompute aggregate policy
- returns explicit refresh result statuses

## Aggregate-to-hypothesis evidence boundary
Fourth runtime handoff in this phase:
- from completed `SetupAggregateResult` to hypothesis evidence updates
- through explicit `AggregateHypothesisEvidenceTrigger` payload

Contracts:
- `packages/domain-model/src/runtime-handoff/aggregate-hypothesis-evidence-trigger.ts`
- `packages/domain-model/src/runtime-handoff/update-hypothesis-from-aggregate-command.ts`
- `packages/domain-model/src/runtime-handoff/hypothesis-evidence-update-result.ts`
- `packages/domain-model/src/runtime-handoff/aggregate-to-hypothesis-evidence.ts`

This boundary is deterministic and service-driven:
- accepts updates only from completed aggregate results
- resolves one target hypothesis id explicitly
- delegates support/weakens/inconclusive interpretation to `ResearchService.updateHypothesisEvidence(...)`
- returns explicit hypothesis-evidence update result statuses

## Hypothesis-evidence to setup-feedback boundary
Fifth runtime handoff in this phase:
- from updated `ResearchHypothesis` evidence to setup-review recommendations
- through explicit `HypothesisFeedbackDecisionTrigger` payload

Contracts:
- `packages/domain-model/src/runtime-handoff/hypothesis-feedback-decision-trigger.ts`
- `packages/domain-model/src/runtime-handoff/review-setup-from-evidence-command.ts`
- `packages/domain-model/src/runtime-handoff/feedback-decision-result.ts`
- `packages/domain-model/src/runtime-handoff/hypothesis-evidence-to-setup-feedback.ts`

This boundary is deterministic and service-driven:
- validates hypothesis/setup/evidence references explicitly
- delegates recommendation semantics to `ResearchService.reviewSetupFromEvidence(...)`
- records `ResearchFeedbackDecision` in `proposed` status
- returns explicit recommendation outcomes without auto-mutating setup definitions

## Research-decision manual approval boundary
Sixth runtime handoff in this phase:
- from proposed `ResearchFeedbackDecision` to explicit reviewer approval outcome
- through explicit `ReviewResearchDecisionCommand` payload

Contracts:
- `packages/domain-model/src/review/review-research-decision-command.ts`
- `packages/domain-model/src/review/research-decision-approval.ts`
- `packages/domain-model/src/review/research-decision-approval-result.ts`
- `packages/domain-model/src/runtime-handoff/research-decision-approval.ts`

This boundary is deterministic and service-driven:
- validates reviewer identity, decision eligibility, and setup linkage explicitly
- delegates approval semantics to `ResearchService.approveFeedbackDecision(...)`
- records `ResearchDecisionApproval` artifacts for auditability
- authorizes future setup action only when outcome is `approved`
- does not automatically mutate setup lifecycle in this slice

## Approved setup lifecycle mutation boundary
Seventh runtime handoff in this phase:
- from approved `ResearchDecisionApproval` to controlled `SetupDefinition` status mutation
- through explicit `ApplyApprovedSetupMutationCommand` payload

Contracts:
- `packages/domain-model/src/review/apply-approved-setup-mutation-command.ts`
- `packages/domain-model/src/review/setup-lifecycle-mutation-record.ts`
- `packages/domain-model/src/review/setup-lifecycle-mutation-result.ts`
- `packages/domain-model/src/runtime-handoff/approved-setup-lifecycle-mutation.ts`

This boundary is deterministic and service-driven:
- requires explicit `approved` approval outcome before mutation
- validates approval/setup/feedback linkage and authorized action matching
- delegates lifecycle legality checks and status application to `SetupDefinitionService.applyApprovedMutation(...)`
- persists `SetupLifecycleMutationRecord` as durable audit artifact
- returns explicit mutation result statuses

## Approved refinement follow-up boundary
Eighth runtime handoff in this phase:
- from approved `ResearchDecisionApproval` with `refine_definition` action
- to structured refinement follow-up request creation

Contracts:
- `packages/domain-model/src/review/create-setup-refinement-request-command.ts`
- `packages/domain-model/src/review/setup-refinement-request.ts`
- `packages/domain-model/src/review/setup-refinement-request-result.ts`
- `packages/domain-model/src/runtime-handoff/approved-refinement-follow-up.ts`

This boundary is deterministic and service-driven:
- requires explicit `approved` outcome and `authorizedNextAction=refine_definition`
- validates approval/setup/feedback linkage and command action explicitly
- delegates refinement request creation semantics to `ResearchService.createRefinementRequest(...)`
- persists `SetupRefinementRequest` as durable reviewable follow-up artifact
- does not auto-apply setup-definition content mutation in this slice

## Setup-refinement to setup-revision boundary
Ninth runtime handoff in this phase:
- from persisted `SetupRefinementRequest` to explicit setup-definition revision creation
- through explicit `CreateSetupDefinitionRevisionCommand` payload

Contracts:
- `packages/domain-model/src/review/create-setup-definition-revision-command.ts`
- `packages/domain-model/src/review/setup-definition-revision.ts`
- `packages/domain-model/src/review/setup-definition-revision-result.ts`
- `packages/domain-model/src/runtime-handoff/setup-definition-revision.ts`

This boundary is deterministic and service-driven:
- validates refinement request and setup-definition linkage explicitly
- delegates version assignment and revision chain semantics to `SetupDefinitionService.createRevision(...)`
- creates a new draft `SetupDefinition` revision rather than mutating previous setup in place
- persists `SetupDefinitionRevision` with family/version linkage metadata
- returns explicit revision creation result statuses
