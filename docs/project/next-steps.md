# Next Steps

## Current recommended next step
### Post-reassessment consolidation before any further scope expansion

Reason:
- constrained Backend live now includes isolated apply, rollback, controlled promotion, and narrow helper-file creation
- stability reassessment coverage now exists and should be kept green across repeated runs
- next risk is accidental scope expansion without sustained stability evidence
- current priority is operational consistency, not new Backend powers

## Recommended near-future sequence
1. keep reassessment matrix green over repeated runs and environments
2. refine documentation and runbooks for promotion conflict handling and rollback triage
3. improve run-level observability outputs (`--output json` plus clearer safety summaries)
4. consider next tiny Backend scope step only after sustained reassessment stability

## Things to avoid while moving forward
- turning everything into prompts
- premature market-data work
- allowing runner logic to become a monolith
- silent fallback from live to mock
- scope creep into a full trading system too early
- adding new Backend write powers before reassessment confidence is sustained
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

pnpm runner run --mode mock --agent-mode backend=live --backend-write apply \
  --backend-promotion promote_verified --stability-reassessment helper_file_create_and_promote \
  --scenario happy --env local --version v1 --task-id task-verify-backend-reassess
```
