---
name: verify-slice
description: Run the repo's baseline persistence verification sequence (domain-model typecheck -> test -> test:integration, then root typecheck -> test) in order, and warn if domain-model changed without updating the canonical status docs. Invoke for "verify", "run the baseline", or /verify-slice.
---

# verify-slice

Run this repo's fixed verification sequence, narrowest first, and stop at the first failure.

## Sequence (in order)
```bash
# 1. domain-model, narrowest first
pnpm --filter @monitor/domain-model typecheck
pnpm --filter @monitor/domain-model test
pnpm --filter @monitor/domain-model test:integration   # opt-in: skips cleanly without PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL

# 2. root fan-out
pnpm typecheck
pnpm test
```
Report each step's result. On the first failure, stop and surface the output — do not continue down the list. `test:integration` skipping (no Postgres URL) is a pass, not a failure; note it skipped.

Shortcut: `pnpm verify:persistence` runs the three domain-model steps as one; run the two root steps after.

## Doc-guard check
The repo rule: **canonical status docs are the source of truth and must be updated when repo reality changes.** After the commands pass, check:

```bash
git status --porcelain packages/domain-model docs/project
```

If files under `packages/domain-model/` changed but **none** of these did, warn the author to update them before continuing (read in this order):
`docs/project/next-steps.md` → `current-phase.md` → `project-overview.md` → `chat-briefing.md` → `decisions-log.md`.

This is a reminder, not a blocker — the author decides. (A stricter always-on version could be a `Stop`/pre-commit hook in `.claude/settings.json`; offer it only if asked.)
