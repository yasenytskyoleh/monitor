#!/usr/bin/env bash
# Stop hook (A): remind the author to update canonical status docs when
# packages/domain-model changed in the working tree but docs/project did not.
# Non-blocking — surfaces a systemMessage; the author decides.
set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}"

changed_domain=$(git status --porcelain -- packages/domain-model 2>/dev/null || true)
changed_docs=$(git status --porcelain -- docs/project 2>/dev/null || true)

if [ -n "$changed_domain" ] && [ -z "$changed_docs" ]; then
  echo '{"systemMessage": "Doc-guard: packages/domain-model changed but docs/project was not updated. Canonical status docs are the source of truth — update in order: next-steps.md -> current-phase.md -> project-overview.md -> chat-briefing.md -> decisions-log.md."}'
fi
exit 0
