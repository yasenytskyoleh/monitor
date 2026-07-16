#!/usr/bin/env bash
# PreToolUse hook (B), matcher Bash: block a `git commit` whose message carries
# Claude attribution trailers, or a Conventional-Commit prefix in its -m/--message
# argument. This repo uses capitalized imperative one-liners naming entity + stage.
# Exit 2 blocks the tool call and feeds stderr back to Claude to rewrite.
# Fails CLOSED: if the payload can't be parsed but looks like a commit, block.
set -uo pipefail
input=$(cat)

# Extract the command via node (guaranteed present in this pnpm/Node repo).
# node exits 3 on unparseable JSON so we can fail closed for commits below.
command=$(printf '%s' "$input" | node -e '
let s = "";
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  try { process.stdout.write(String((JSON.parse(s).tool_input || {}).command || "")); }
  catch { process.exit(3); }
})') || {
  # Parse failed. Only block if the raw payload looks like a git commit,
  # so unrelated Bash calls are never blocked by a parser hiccup.
  if printf '%s' "$input" | grep -q 'git commit'; then
    echo "commit-guard: could not parse hook input for a git commit; blocking to fail closed." >&2
    exit 2
  fi
  exit 0
}

case "$command" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

reasons=""
if printf '%s' "$command" | grep -qiE 'Co-Authored-By:[[:space:]]*Claude'; then
  reasons="$reasons"$'\n'"- contains a 'Co-Authored-By: Claude' trailer (global rule forbids it)"
fi
if printf '%s' "$command" | grep -qiE 'Generated with[[:space:]].*Claude'; then
  reasons="$reasons"$'\n'"- contains a 'Generated with Claude Code' footer (global rule forbids it)"
fi
# CC prefix in the message argument: -m msg, -m"msg", --message=msg, --message msg.
# (Editor/-F commits carry no inline message and are not inspected — best effort.)
if printf '%s' "$command" | grep -qE -- "(-m|--message)[[:space:]]*=?[[:space:]]*[\"']?(feat|fix|chore|docs|refactor|test|style|perf|build|ci)(\([^)]*\))?!?:"; then
  reasons="$reasons"$'\n'"- uses a Conventional-Commit prefix; this repo uses capitalized imperative one-liners naming entity + rollout stage"
fi

if [ -n "$reasons" ]; then
  printf 'Commit blocked by commit-guard:%s\n\nRewrite the message per repo/global commit rules and retry.\n' "$reasons" >&2
  exit 2
fi
exit 0
