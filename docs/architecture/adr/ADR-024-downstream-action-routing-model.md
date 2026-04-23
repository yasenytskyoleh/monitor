# ADR-024: Downstream Action Routing Model

## Status
Accepted

## Context
After ADR-023, Monitor can record explicit review decisions (`accepted`, `rejected`, `revise`) from research review packets.

The next missing boundary is deterministic routing from recorded review decision intent into one downstream action family.

## Decision
Introduce a first routing model:
- input: `RouteAcceptedReviewDecisionCommand`
- route targets: `DownstreamActionTarget`
- route statuses: `ReviewDecisionRouteStatus`
- routing result artifact: `ReviewDecisionRoutingResult`
- routing service: `ReviewDecisionRoutingService.route(...)`

Routing is separate from:
- review decision recording
- downstream action execution

## First route targets
- `apply_setup_lifecycle_mutation`
- `create_setup_refinement_request`
- `activate_setup_revision`
- `no_op_confirmed`

## First route statuses
- `routed`
- `rejected_validation`
- `rejected_lifecycle`
- `no_action`
- `failed`

## Eligibility rules
- recorded decision must exist
- command scope must match recorded decision scope
- only explicit `decisionOutcome` + explicit `authorizedNextAction` drive routing
- no hidden defaults except explicit no-op mapping

Outcome rules:
- `accepted`: routes via authorized next action to lifecycle/refinement/activation/no-op
- `rejected`: returns `no_action`; no executable route
- `revise`: may only route to refinement follow-up target

## Determinism boundary
In this slice:
- no freeform LLM routing
- no hidden policy engine
- no heuristic fallback to default executable routes
- no automatic downstream execution

## Failure policy
- missing decision/invalid selectors -> `rejected_validation`
- outcome/action conflicts or missing routing context -> `rejected_lifecycle`
- rejected decision with forced action -> `rejected_lifecycle`
- unexpected runtime error -> `failed`

## Consequences
Positive:
- accepted review decisions can be mapped to explicit next action families
- no-action cases remain explicit and auditable
- routing output is portable to future execution layer

Trade-offs:
- still no execution engine
- no retry/queue/workflow runtime in this slice

## Explicitly postponed
- automatic downstream action execution
- product workflow engine/inbox
- policy DSL for routing
- retry/queue infrastructure
