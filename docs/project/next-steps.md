# Next Steps

## Current recommended next step
### Backend constrained-mode hardening and observability polish

Reason:
- constrained Backend live mode now exists
- shared live adapter pipeline is now centralized and reusable
- approval and artifact/reference enforcement is already strong
- next risk is unsafe scope expansion or weak patch traceability
- hardening and observability now provide the best risk reduction

## Recommended near-future sequence
1. tighten Backend safety boundaries (scope caps, stricter path policies, explicit escalation triggers)
2. improve run-level observability outputs (`--output json` plus richer patch-plan summaries)
3. stabilize replay/debug workflow from persisted run artifacts
4. introduce narrowly scoped market/signal domain slice only after runner stability

## Things to avoid while moving forward
- turning everything into prompts
- premature market-data work
- allowing runner logic to become a monolith
- silent fallback from live to mock
- scope creep into a full trading system too early
- relying on memory instead of written project context

## Baseline verification commands
Use these commands before starting new implementation work:

```bash
pnpm --filter @monitor/orchestrator-runner typecheck
pnpm --filter @monitor/orchestrator-runner test
```

Quick run-path checks:

```bash
pnpm runner run --mode mock --scenario happy --env local --version v1 \
  --task-id task-verify-mock-happy --requested-by oleh --task-title "Verify mock happy"

pnpm runner run --mode mock --scenario missing-approval --env local --version v1 \
  --task-id task-verify-mock-reject --requested-by oleh --task-title "Verify mock rejection"

pnpm runner run --mode live --env local --version v1 \
  --task-id task-verify-live --requested-by oleh --task-title "Verify live chain"
```
