# Setup Review Approval Flow

## Happy path (first version)
1. persisted `ResearchFeedbackDecision` exists in `proposed`
2. reviewer submits `ReviewResearchDecisionCommand`
3. approval handoff validates feedback decision, setup definition, reviewer identity, and outcome
4. `ResearchService.approveFeedbackDecision(...)` is called
5. feedback decision status is updated (`accepted`, `rejected`, or `reviewed`)
6. `ResearchDecisionApproval` artifact is created
7. result returns decision id, setup id, and approval outcome

Coordinator:
- `createResearchDecisionApprovalHandoff`
- `packages/domain-model/src/runtime-handoff/research-decision-approval.ts`

## Failure boundaries
- missing feedback decision -> `rejected_validation`
- missing setup definition -> `rejected_validation`
- missing reviewer identity -> `rejected_validation`
- invalid approval outcome -> `rejected_validation`
- non-eligible feedback decision status -> `rejected_lifecycle`
- approval artifact persistence failure -> `failed` with retry warning

## Gated mutation rule
- approval is separate from recommendation
- approved outcome authorizes a future action only
- setup lifecycle mutation is still owned and enforced by setup-definition service logic
- recommendation or approval artifacts do not bypass setup transition checks

## Postponed work
- automated lifecycle mutation from approved decisions
- reviewer UI/dashboard
- notification and assignment workflows
- role-based permissions redesign
- batch approval orchestration
