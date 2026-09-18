# `docs/project/` index

Index of the project documents.

**Read the canonical status docs in this order.** `next-steps.md` is authoritative for the current
step; the others restate it.

1. [Next Steps](next-steps.md)
2. [Current Phase](current-phase.md)
3. [Project Overview](project-overview.md)
4. [Chat Briefing](chat-briefing.md)
5. [Decisions Log](decisions-log.md)

Architecture decision records live in `../architecture/adr/`.

## Supporting documents

### Operations and runbooks

- [Autonomous Mode Policy](autonomous-mode-policy.md)
- [BTC bounded-job cadence](btc-job-cadence-runbook.md)
- [Local PostgreSQL Development](local-postgresql-development.md)
- [Scheduled Job Run Ownership](scheduled-job-run-ownership.md)

### Market ingestion, detection and evaluation

- [Binance Spot Candle Ingestion](binance-spot-candle-ingestion.md)
- [Candidate to Evaluation Flow](candidate-to-evaluation-flow.md)
- [Closed-Candle Evaluation](closed-candle-evaluation.md)
- [Closed-Candle Pattern Detection](closed-candle-pattern-detection.md)
- [Detection to Candidate Flow](detection-to-candidate-flow.md)
- [Evaluation Model](evaluation-model.md)
- [Evaluation Result Model](evaluation-result-model.md)
- [Evaluation Trigger Model](evaluation-trigger-model.md)
- [Monitored Symbol Relational Persistence Model](monitored-symbol-relational-persistence-model.md)
- [Monitoring Model](monitoring-model.md)
- [Normalized Events](normalized-events.md)
- [Outcome Metrics](outcome-metrics.md)
- [Signal Candidate Model](signal-candidate-model.md)

### Notifications and delivery

- [Pattern-notification eligibility](pattern-notification-eligibility.md)
- [Pattern-notification retention and delivery boundary](pattern-notification-retention-delivery.md)
- [Telegram pattern-notification delivery](telegram-pattern-notification-delivery.md)

### Research, aggregation and hypotheses

- [Aggregate to Hypothesis Flow](aggregate-to-hypothesis-flow.md)
- [Aggregation Refresh Model](aggregation-refresh-model.md)
- [Completed Aggregate Hypothesis Evidence Runtime](completed-aggregate-hypothesis-evidence.md)
- [Completed-Evaluation Aggregation](completed-evaluation-aggregation.md)
- [Evaluation to Aggregate Flow](evaluation-to-aggregate-flow.md)
- [Hypothesis Evidence Model](hypothesis-evidence-model.md)
- [Hypothesis evidence to setup-feedback runtime](hypothesis-evidence-to-setup-feedback.md)
- [Manual research decision approval runtime](manual-research-decision-approval.md)
- [Research Aggregation Model](research-aggregation-model.md)
- [Research Decision Approval Model](research-decision-approval-model.md)
- [Research Decision Approval Relational Adapter Model](research-decision-approval-relational-adapter-model.md)
- [Research Decision Approval Relational Persistence Model](research-decision-approval-relational-persistence-model.md)
- [Research Decision Approval Relational Rollout Model](research-decision-approval-relational-rollout-model.md)
- [Research Feedback Decision Relational Persistence Model](research-feedback-decision-relational-persistence-model.md)
- [Research Feedback Decision Relational Rollout Model](research-feedback-decision-relational-rollout-model.md)
- [Research Feedback Loop](research-feedback-loop.md)
- [Research Model](research-model.md)
- [Research Review Decision Relational Adapter Model](research-review-decision-relational-adapter-model.md)
- [Research Review Decision Relational Persistence Model](research-review-decision-relational-persistence-model.md)
- [Research Review Decision Relational Rollout Model](research-review-decision-relational-rollout-model.md)
- [Research review-decision runtime](research-review-decision-runtime.md)
- [Research Review Packet Model](research-review-packet-model.md)
- [Research review-packet runtime](research-review-packet-runtime.md)
- [Research Run Lifecycle Model](research-run-lifecycle-model.md)
- [Research Run Relational Persistence Model](research-run-relational-persistence-model.md)
- [Setup Aggregate Relational Persistence Model](setup-aggregate-relational-persistence-model.md)
- [Setup Aggregate Relational Rollout Model](setup-aggregate-relational-rollout-model.md)
- [Setup Aggregate Result Model](setup-aggregate-result-model.md)
- [Setup Comparison Model](setup-comparison-model.md)

### Review, approval, routing and execution

- [Activation-envelope executor](activation-envelope-executor.md)
- [Downstream Action Execution Flow](downstream-action-execution-flow.md)
- [Downstream Action Routing Model](downstream-action-routing-model.md)
- [Execution Attempt Audit Model](execution-attempt-audit-model.md)
- [Execution-attempt runtime](execution-attempt-runtime.md)
- [Implemented Product Approval Composition Model](implemented-product-approval-composition-model.md)
- [Implemented Product Approval Integration Model](implemented-product-approval-integration-model.md)
- [Implemented Product Review Decision Composition Model](implemented-product-review-decision-composition-model.md)
- [Implemented Product Review Decision Integration Model](implemented-product-review-decision-integration-model.md)
- [Implemented Product Review Decision Routing Result Composition Model](implemented-product-review-decision-routing-result-composition-model.md)
- [Implemented Product Review Decision Routing Result Integration Model](implemented-product-review-decision-routing-result-integration-model.md)
- [Implemented Product Routed Action Execution Envelope Composition Model](implemented-product-routed-action-execution-envelope-composition-model.md)
- [Implemented Product Routed Action Execution Envelope Integration Model](implemented-product-routed-action-execution-envelope-integration-model.md)
- [Lifecycle-envelope executor](lifecycle-envelope-executor.md)
- [Refinement-envelope executor](refinement-envelope-executor.md)
- [Review Decision Application Model](review-decision-application-model.md)
- [Review Decision Routing Result Relational Adapter Model](review-decision-routing-result-relational-adapter-model.md)
- [Review Decision Routing Result Relational Persistence Model](review-decision-routing-result-relational-persistence-model.md)
- [Review-decision routing runtime](review-decision-routing-runtime.md)
- [Review Decision To Action Map](review-decision-to-action-map.md)
- [Review Packet Contents](review-packet-contents.md)
- [Review Packet Resolution Flow](review-packet-resolution-flow.md)
- [Review-routing persistence runtime](review-routing-persistence-runtime.md)
- [Routed Action Execution Envelope Relational Adapter Model](routed-action-execution-envelope-relational-adapter-model.md)
- [Routed Action Execution Envelope Relational Persistence Model](routed-action-execution-envelope-relational-persistence-model.md)
- [Routed Action Execution Envelope Relational Rollout Model](routed-action-execution-envelope-relational-rollout-model.md)
- [Routed Action Execution Envelope](routed-action-execution-envelope.md)
- [Routed Action Execution Result Storage Model](routed-action-execution-result-storage-model.md)
- [Routed-action preparation runtime](routed-action-preparation-runtime.md)
- [Setup Review Approval Flow](setup-review-approval-flow.md)
- [Setup Review Decision Model](setup-review-decision-model.md)

### Setup lifecycle, revisions and activation

- [Approved Refinement Follow-Up Flow](approved-refinement-follow-up-flow.md)
- [Approved refinement follow-up runtime](approved-refinement-follow-up.md)
- [Approved setup lifecycle runtime](approved-setup-lifecycle-runtime.md)
- [Approved Setup Mutation Flow](approved-setup-mutation-flow.md)
- [Before/After Revision Evidence](before-after-revision-evidence.md)
- [Implemented Product Feedback-Decision Composition Model](implemented-product-feedback-decision-composition-model.md)
- [Implemented Product Setup Definition Revision Composition Model](implemented-product-setup-definition-revision-composition-model.md)
- [Implemented Product Setup Definition Revision Integration Model](implemented-product-setup-definition-revision-integration-model.md)
- [Implemented Product Setup Lifecycle Mutation Composition Model](implemented-product-setup-lifecycle-mutation-composition-model.md)
- [Implemented Product Setup Lifecycle Mutation Integration Model](implemented-product-setup-lifecycle-mutation-integration-model.md)
- [Implemented Product Setup Refinement Request Composition Model](implemented-product-setup-refinement-request-composition-model.md)
- [Implemented Product Setup Refinement Request Integration Model](implemented-product-setup-refinement-request-integration-model.md)
- [Implemented Product Setup Revision Activation Composition Model](implemented-product-setup-revision-activation-composition-model.md)
- [Implemented Product Setup Revision Activation Integration Model](implemented-product-setup-revision-activation-integration-model.md)
- [Revision-Aware Runtime Model](revision-aware-runtime-model.md)
- [Revision History Query Model](revision-history-query-model.md)
- [Revision Impact Classification](revision-impact-classification.md)
- [Setup Definition Revision Model](setup-definition-revision-model.md)
- [Setup Definition Revision Relational Adapter Model](setup-definition-revision-relational-adapter-model.md)
- [Setup Definition Revision Relational Persistence Model](setup-definition-revision-relational-persistence-model.md)
- [Setup Definition Revision Relational Rollout Model](setup-definition-revision-relational-rollout-model.md)
- [Setup Family History View](setup-family-history-view.md)
- [Setup Lifecycle Mutation Model](setup-lifecycle-mutation-model.md)
- [Setup Lifecycle Mutation Relational Adapter Model](setup-lifecycle-mutation-relational-adapter-model.md)
- [Setup Lifecycle Mutation Relational Persistence Model](setup-lifecycle-mutation-relational-persistence-model.md)
- [Setup Lifecycle Mutation Relational Rollout Model](setup-lifecycle-mutation-relational-rollout-model.md)
- [Setup Refinement Request Model](setup-refinement-request-model.md)
- [Setup Refinement Request Relational Adapter Model](setup-refinement-request-relational-adapter-model.md)
- [Setup Refinement Request Relational Persistence Model](setup-refinement-request-relational-persistence-model.md)
- [Setup Refinement Request Relational Rollout Model](setup-refinement-request-relational-rollout-model.md)
- [Setup Revision Activation Model](setup-revision-activation-model.md)
- [Setup Revision Activation Relational Adapter Model](setup-revision-activation-relational-adapter-model.md)
- [Setup Revision Activation Relational Persistence Model](setup-revision-activation-relational-persistence-model.md)
- [Setup Revision Activation Relational Rollout Model](setup-revision-activation-relational-rollout-model.md)
- [Setup revision activation runtime](setup-revision-activation-runtime.md)
- [Setup Revision Comparison Model](setup-revision-comparison-model.md)
- [Setup Revision Impact Summary Model](setup-revision-impact-summary-model.md)
- [Setup revision proposal runtime](setup-revision-proposal-runtime.md)
- [Setup Revision Resolution Flow](setup-revision-resolution-flow.md)
- [Setup Superseding Strategy](setup-superseding-strategy.md)
- [Setup Versioning Strategy](setup-versioning-strategy.md)

### Persistence and storage architecture

- [Durable Relational Persistence Model](durable-relational-persistence-model.md)
- [First Persisted Slice](first-persisted-slice.md)
- [Implemented Product Relational Composition Model](implemented-product-relational-composition-model.md)
- [Persistence Boundaries](persistence-boundaries.md)
- [Persistence Implementation Architecture](persistence-implementation-architecture.md)
- [Prisma Schema Implementation Model](prisma-schema-implementation-model.md)
- [Relational Adapter Rollout Model](relational-adapter-rollout-model.md)
- [Relational Repository Implementation Model](relational-repository-implementation-model.md)
- [Signal/Evaluation Relational Rollout Model](signal-evaluation-relational-rollout-model.md)
- [Storage Architecture](storage-architecture.md)

### Domain model and flows

- [Domain Model](domain-model.md)
- [First Application Flow](first-application-flow.md)
- [Product Service Flow](product-service-flow.md)
- [Runtime Handoff Model](runtime-handoff-model.md)
