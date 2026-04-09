# Next Steps

## Current recommended next step
### PR #11 — first live Backend Agent path (controlled)

Reason:
- non-implementation live chain is complete (Product, Architect, Quant Pattern, Docs Reviewer)
- shared live adapter pipeline is now centralized and reusable
- approval and artifact/reference enforcement is already strong
- Backend is the next workflow-critical state to validate in live mode
- adding Backend live now tests implementation-stage constraints without redesigning the platform

## Recommended near-future sequence
1. live Backend Agent (strict schema + artifact contract)
2. tighten Backend safety boundaries (contract compliance + explicit limitations)
3. improve run-level observability outputs (`--output json` plus richer summary contracts)
4. stabilize replay/debug workflow from persisted run artifacts
5. only then start market/signal domain slices incrementally

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
