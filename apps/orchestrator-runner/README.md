# Orchestrator Runner

Run live workflow transitions using:
- compiled config snapshot
- `OrchestratorCore`
- real OpenAI Product + Architect handlers

## Requirements
- `OPENAI_API_KEY` set in environment
- repository configs present under `configs/agents`

## Environment setup
Create `.env` in repo root from the template. Runner auto-loads it on start:

```bash
cp .env.example .env
```

Optional: if you prefer shell-level env vars, you can still `source .env` manually.

## Usage
Run one step to `DESIGN`:
```bash
pnpm --filter @monitor/orchestrator-runner start -- \
  --env local \
  --version v1 \
  --target-state DESIGN \
  --task-id task-live-001 \
  --requested-by oleh \
  --task-title "Detect BTC entry points"
```

Run two steps to `FORMALIZE` (includes approval-gated `DESIGN -> FORMALIZE`):
```bash
pnpm --filter @monitor/orchestrator-runner start -- \
  --env local \
  --version v1 \
  --target-state FORMALIZE \
  --task-id task-live-002 \
  --requested-by oleh \
  --approval-id appr-arch-002 \
  --approval-by architecture-reviewer \
  --task-title "Detect BTC entry points"
```

If `--approval-id`, `--approval-by`, or `--approval-at-utc` are omitted, runner generates sensible defaults.

Optional input payload from JSON file:
```bash
pnpm --filter @monitor/orchestrator-runner start -- \
  --env local \
  --target-state FORMALIZE \
  --input-file ./runtime/task-input.json
```

The command prints:
- snapshot metadata
- resulting task state (`DESIGN` or `FORMALIZE`)
- last agent output envelope
- transition records for this run
- transition log path (JSONL)
