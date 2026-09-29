# Research Workflow Runner

Manual one-shot entrypoints for the persisted post-decision research workflow. Each invocation
performs exactly one step and prints its result as JSON. The runner does not chain steps, retry,
schedule work, deliver Telegram messages, or place trades.

## Prerequisites

- `DATABASE_URL` points to a migrated product database.
- The referenced review decision, target entities, and approvals already exist.

## Route a recorded review decision

```bash
pnpm research-workflow route \
  --decision-id review-decision-001 \
  --routed-at 2026-09-29T10:00:00.000Z
```

Use the returned `routingId` in the next command.

## Prepare one routed action

```bash
pnpm research-workflow prepare \
  --routing-id 'review-route:review-decision-001:2026-09-29T10:00:00.000Z' \
  --prepared-by operator-001 \
  --prepared-at 2026-09-29T10:01:00.000Z \
  --setup-revision-id setup-revision-001
```

Target-reference flags are explicit and depend on the routed action:

- `--setup-definition-id`
- `--setup-revision-id`
- `--research-hypothesis-id`
- `--research-feedback-decision-id`
- `--research-decision-approval-id`

Refinement preparation also requires `--requested-by`, `--requested-at`,
`--refinement-rationale`, and `--requested-changes`. Repeat `--evidence-reference` for each
evidence identifier. Use the returned `envelopeId` for execution.

## Execute one prepared envelope

```bash
pnpm research-workflow execute \
  --envelope-id 'execution-envelope:review-route:review-decision-001:2026-09-29T10:00:00.000Z:2026-09-29T10:01:00.000Z' \
  --attempt-id execution-attempt-001 \
  --attempted-by operator-001 \
  --attempted-at 2026-09-29T10:02:00.000Z \
  --executed-by reviewer-001 \
  --executed-at 2026-09-29T10:02:01.000Z
```

`--origin-run-id` is optional for preparation and execution. Validation, lifecycle, rejected, and
failed outcomes are printed as JSON and return a non-zero process exit code.

## Verification

```bash
pnpm --filter @monitor/research-workflow-runner typecheck
pnpm --filter @monitor/research-workflow-runner test
pnpm --filter @monitor/research-workflow-runner test:integration
```

The integration command is opt-in through `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL` and refuses a
database whose name does not contain `test`, `integration`, or `ci`.
