#!/usr/bin/env bash
# SessionStart hook (C): surface the living source of truth so a fresh instance
# starts aligned. stdout is added to session context. Runs on every SessionStart
# (startup/resume/clear/compact), not just once.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}"

echo "## Canonical status (auto-surfaced by SessionStart hook)"
echo
echo "Source of truth: docs/project/. Read in order: next-steps.md -> current-phase.md -> project-overview.md -> chat-briefing.md -> decisions-log.md."
echo

if [ -f docs/project/current-phase.md ]; then
  echo "### current-phase.md — Phase"
  grep -m1 -A1 '^## Phase$' docs/project/current-phase.md | tail -1 || echo "(phase heading not found)"
  echo
fi

if [ -f docs/project/next-steps.md ]; then
  echo "### next-steps.md — recommended next step"
  awk '/^## Current recommended next step/{f=1} /^## Recommended near-future sequence/{f=0} f{print}' docs/project/next-steps.md
fi
