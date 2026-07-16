#!/usr/bin/env bash
# PostToolUse hook (D), matcher Edit|Write|MultiEdit: after editing a .ts file in
# packages/domain-model, typecheck that package and surface errors back to Claude.
# Runs tsc directly (the Prisma client is checked in) to skip the prisma:generate
# pre-hook the package's typecheck script would otherwise run on every edit.
# Fails SAFE: if the payload can't be parsed, run the typecheck rather than skip it.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}"
input=$(cat)

# Extract file_path via node (guaranteed present in this pnpm/Node repo).
file_path=$(printf '%s' "$input" | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  try { process.stdout.write(String((JSON.parse(s).tool_input || {}).file_path || "")); }
  catch { process.exit(3); }
})') || file_path="__unparsed__"

case "$file_path" in
  __unparsed__) echo "domain-model-typecheck: unparseable input; running typecheck to be safe." >&2 ;;  # fall through
  *packages/domain-model/src/generated/*) exit 0 ;;  # generated client is off-limits
  *packages/domain-model/*.ts) ;;
  *) exit 0 ;;
esac

if ! out=$(pnpm --filter @monitor/domain-model exec tsc -p tsconfig.json --noEmit 2>&1); then
  printf 'domain-model typecheck failed after editing %s:\n\n%s\n' "$file_path" "$out" >&2
  exit 2
fi
exit 0
