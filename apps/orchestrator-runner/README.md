# Orchestrator Runner

Run workflow transitions using:
- compiled config snapshot
- `OrchestratorCore`
- deterministic mocked handlers (`--mode mock`)
- hybrid live mode (`--mode live`): Product Agent live via OpenAI, other agents mocked

## Requirements
- repository configs present under `configs/agents`
- `OPENAI_API_KEY` in environment or `.env` for `--mode live`

## Environment setup
Create `.env` in repo root from the template. Runner auto-loads it on start:

```bash
cp .env.example .env
```

Optional: if you prefer shell-level env vars, you can still `source .env` manually.

## Usage
Default mode is `live`.

Run mocked happy flow:
```bash
pnpm runner run \
  --mode mock \
  --scenario happy \
  --env local \
  --version v1 \
  --task-id task-mock-001 \
  --requested-by oleh \
  --task-title "Mock happy flow"
```

Run missing-approval rejection flow:
```bash
pnpm runner run \
  --mode mock \
  --scenario missing-approval \
  --env local \
  --version v1 \
  --task-id task-mock-002 \
  --requested-by oleh \
  --task-title "Mock rejection flow"
```

Run both scenarios in one command:
```bash
pnpm runner run \
  --mode mock \
  --scenario both \
  --env local \
  --version v1 \
  --task-id task-mock-003 \
  --requested-by oleh \
  --task-title "Mock both flows"
```

Optional input payload from JSON file:
```bash
pnpm runner run \
  --mode mock \
  --scenario happy \
  --env local \
  --input-file ./runtime/task-input.json
```

Output is stable text by default:
- run id
- final state and outcome
- rejection reason (when applicable)
- run artifact folder path

Use JSON output for automation:
```bash
pnpm runner run \
  --mode mock \
  --scenario happy \
  --env local \
  --output json
```

Outcome values:
- `success`
- `policy_rejection`
- `runtime_failure`

Persisted run artifacts are written to:
- `runtime/runs/<runId>/run.json`
- `runtime/runs/<runId>/transitions.json`
- `runtime/runs/<runId>/terminal-outcome.json`
- optional: `runtime/runs/<runId>/input-task.json`
- optional: `runtime/runs/<runId>/compiled-snapshot-meta.json`

Run hybrid live path (Product Agent live, remaining agents mocked):
```bash
pnpm runner run \
  --mode live \
  --env local \
  --version v1 \
  --task-id task-live-001 \
  --requested-by oleh \
  --task-title "Detect BTC entry points" \
  --model gpt-5.4-mini
```

Live Product Agent contract in this step:
- OpenAI response must be JSON-only
- output must pass `agent-output-envelope` schema validation
- invalid model output fails the run (no silent repair fallback)
- Product live has an intentional agent-specific extension: `metrics` must include
  `problemStatement`, `scope`, `assumptions[]`, `acceptanceCriteria[]`, `backlogItem`
  for bounded intake quality.
