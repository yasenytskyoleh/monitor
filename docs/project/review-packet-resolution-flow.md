# Review Packet Resolution Flow

## Happy path
1. Review packet exists and is selected for manual resolution.
2. `ApplyResearchReviewDecisionCommand` is built with reviewer identity, outcome, and optional next action.
3. Packet linkage/scope is validated.
4. Outcome semantics are validated:
   - accepted: optional explicit next action (defaults to `confirm_no_change`)
   - rejected: no next action
   - revise: explicit refinement follow-up intent
5. `ResearchReviewDecision` record is created.
6. Decision result is returned with packet reference and explicit outcome.

## Failure examples
- missing packet id/reviewer/outcome -> `rejected_validation`
- packet not found -> `rejected_linkage`
- packet family/revision/hypothesis mismatch -> `rejected_linkage`
- packet in failed state -> `rejected_lifecycle`
- accepted on insufficient-context packet -> `rejected_lifecycle`
- persistence failure -> `failed`

## Authorized-next-action semantics
- authorized next actions are explicit and optional by outcome
- rejected outcome cannot carry authorized next action
- revise outcome is constrained to refinement follow-up intent
- recorded next action is intent only; downstream services still enforce their own rules before acting

## Explicitly out of scope
- review inbox/work queue
- reviewer assignment workflow
- automatic downstream mutation/refinement/activation
- autonomous policy decisions
