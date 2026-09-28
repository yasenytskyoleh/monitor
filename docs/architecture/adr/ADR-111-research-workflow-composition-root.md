# ADR-111: Research Workflow Composition Root

## Context

The product packages now contain the complete contract-first research, review, routing,
preparation, and non-trading execution chain. Durable repositories are available through one
Prisma-backed bundle, and each runtime is tested in isolation. The chain still has no application
composition root: most of its packages have no workspace consumer, so no product-side entrypoint
assembles them into an operable workflow.

None of the existing apps is the right owner:

- `apps/btc-monitor` owns public market ingestion, evaluation, aggregation, and notification work.
- `apps/orchestrator-runner` owns agent workflow execution and must not write product records.
- `packages/domain-model` owns contracts, services, and persistence composition, not process or
  operator entrypoints.

Putting review execution into any of those boundaries would mix responsibilities and make an
eventually automated product mutation look like a normal market-data or orchestration side effect.

## Decision

Create a dedicated product-side composition root at `apps/research-workflow-runner`.

The app will compose the shared Prisma repository bundle with the existing research, review,
routing, preparation, execution-attempt, and allowlisted envelope-executor packages. It will expose
explicit one-shot operator commands rather than a daemon or scheduler.

The first implementation slice is the already-approved downstream path:

1. load and route one persisted research review decision;
2. prepare one durable routed-action execution envelope using caller-supplied target references;
3. execute one prepared envelope through an allowlisted dispatcher for activation, lifecycle, or
   refinement;
4. retain the received and terminal execution-attempt audit through the shared repository bundle.

The dispatcher selects only from the three existing non-trading executors by the envelope's durable
action target. Unsupported or no-action targets are rejected without dispatch. Each executor keeps
its existing payload, authorization, and entity-correlation validation.

Operator identity, timestamps, target references, and attempt identifiers remain explicit command
inputs. The app does not infer them from routing metadata. A caller must invoke each step; completing
one step does not automatically trigger the next.

Later slices may add the upstream review-packet, decision, approval, feedback, hypothesis-evidence,
and aggregation runtimes to the same app boundary. They must preserve the manual review and approval
gates already defined by the domain services.

## Consequences

Positive:

- the product workflow gets one concrete owner without coupling it to BTC ingestion or agent
  orchestration;
- existing runtime packages gain a real consumer while their domain rules remain unchanged;
- routing, preparation, dispatch, and audit share one durable repository bundle;
- one-shot commands make operator intent and failure boundaries observable and testable.

Tradeoffs:

- the first slice composes only the post-decision path, so the full research chain is not yet one
  command;
- operators must pass explicit identifiers between steps;
- the new app adds build-order dependencies on several existing packages.

## Guardrails

- no direct product writes outside service/repository boundaries;
- no dependency from `domain-model` back to runtime packages;
- no writes from `orchestrator-runner` into product persistence;
- no background scheduler, queue, automatic chaining, provider retry, or execution retry;
- no automatic Telegram delivery;
- no exchange credentials, order placement, or other trading behavior;
- no inference of reviewer, approval, target-reference, or operator fields.

## Follow-up

1. Add the `apps/research-workflow-runner` package and a composition factory for the post-decision
   path.
2. Add the allowlisted three-target executor dispatcher and unit coverage for every target and the
   fail-closed fallback.
3. Add an opt-in real-Postgres integration test covering route -> prepare -> audited execution for
   one non-trading target.
4. Add upstream runtimes incrementally without bypassing manual approval boundaries.
