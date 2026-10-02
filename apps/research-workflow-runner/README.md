# Research Workflow Runner

Manual one-shot entrypoints for the research review and execution workflow. Each invocation
performs exactly one step and prints its result as JSON. The runner does not chain steps, retry,
schedule work, deliver Telegram messages, or place trades.

## Prerequisites

- `DATABASE_URL` points to a migrated product database.
- Referenced setup, feedback, approval, and downstream target records already exist as needed.

## Build one review packet

```bash
pnpm research-workflow review-packet \
  --setup-family-id setup-family-001 \
  --setup-revision-id setup-revision-001 \
  --research-feedback-decision-id feedback-001 \
  --research-decision-approval-id approval-001 \
  --impact-summary-file /tmp/monitor-impact-summary.json \
  --built-at 2026-09-30T10:00:00.000Z \
  --output-file /tmp/monitor-review-packet.json
```

The command creates a new JSON file and never overwrites an existing one. Inspect its `status`,
`warnings`, and `packet.id` before deciding. Review packets are query artifacts, not database
records; keep the file unchanged for the next command. Use an absolute file path because `pnpm`
starts the command from the app directory. Optional selectors are
`--research-hypothesis-id` and `--origin-run-id`.

`--impact-summary-file` is optional when building a partial packet. To build a complete packet,
provide a JSON result with `status: "summarized"` and a `summary` produced by the existing
`buildImpactSummary` query service. The runner validates its structure and the packet service
checks that its family and revision context match the packet request.

## Record one human review decision

```bash
pnpm research-workflow review-decision \
  --packet-file /tmp/monitor-review-packet.json \
  --packet-id 'review-packet:setup-family-001:setup-revision-001:2026-09-30T10:00:00.000Z' \
  --setup-family-id setup-family-001 \
  --setup-revision-id setup-revision-001 \
  --reviewed-by reviewer-001 \
  --reviewed-at 2026-09-30T10:01:00.000Z \
  --outcome revise \
  --authorized-next-action prepare_refinement_follow_up
```

`--outcome` accepts `accepted`, `rejected`, or `revise`. Optional fields are
`--research-hypothesis-id`, `--reviewer-notes`, `--authorized-next-action`, and `--origin-run-id`.
The domain service validates packet linkage, eligibility, and action semantics before it writes the
decision. The packet file is operator-supplied evidence, so retain and review it as a trusted local
artifact. Use the returned `researchReviewDecisionId` for routing.

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

`--origin-run-id` is optional for preparation and execution. Validation, linkage, lifecycle,
rejected, and failed outcomes are printed as JSON and return a non-zero process exit code.

## Verification

```bash
pnpm --filter @monitor/research-workflow-runner typecheck
pnpm --filter @monitor/research-workflow-runner test
pnpm --filter @monitor/research-workflow-runner test:integration
```

The integration command is opt-in through `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL` and refuses a
database whose name does not contain `test`, `integration`, or `ci`.
