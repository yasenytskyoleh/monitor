# Orchestrator Runner

Run workflow transitions using:
- compiled config snapshot
- `OrchestratorCore`
- deterministic mocked handlers (`--mode mock`)
- per-agent execution mode selection (`--agent-mode ...`)

## Requirements
- repository configs present under `configs/agents`
- `OPENAI_API_KEY` in environment or `.env` whenever any agent is configured as `live`

## Environment setup
Create `.env` in repo root from the template. Runner auto-loads it on start:

```bash
cp .env.example .env
```

Optional: if you prefer shell-level env vars, you can still `source .env` manually.

## Usage
Default mode is `live`:
- `product-agent` resolves to `live`
- `architect-agent` resolves to `live`
- `quant-pattern-agent` resolves to `live`
- `docs-reviewer-agent` resolves to `live`
- `backend-agent` resolves to `mock` until its live adapter is implemented

Execution mode precedence:
1. Start from `--mode`.
2. Resolve defaults for all agents.
3. Apply `--agent-mode` overrides.
4. Validate final map before execution.

Current live adapter coverage:
- `product-agent`: live supported
- `architect-agent`: live supported
- `quant-pattern-agent`: live supported
- `docs-reviewer-agent`: live supported
- `backend-agent`: mock only

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

Run hybrid mode explicitly (recommended):
```bash
pnpm runner run \
  --mode mock \
  --agent-mode product=live,architect=live,quant-pattern=live,docs-reviewer=live \
  --scenario happy \
  --env local \
  --version v1 \
  --task-id task-hybrid-001
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

Run missing-approval with live Architect (approval gate remains enforced):
```bash
pnpm runner run \
  --mode mock \
  --agent-mode architect=live \
  --scenario missing-approval \
  --env local \
  --version v1 \
  --task-id task-mock-arch-live-rejection
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
- `runtime/runs/<runId>/artifacts.json`
- optional: `runtime/runs/<runId>/input-task.json`
- optional: `runtime/runs/<runId>/compiled-snapshot-meta.json`

`run.json` includes resolved `agentModes` so each run is fully traceable.

Artifact enforcement is strict across workflow transitions:
- emitted artifacts are normalized into explicit records (`artifactRef`, `artifactType`, `producedBy`, `state`, `runId`, `taskId`, `version`, `createdAtUtc`)
- each agent role can emit only allowlisted artifact types
- transition artifact references must resolve to artifacts produced earlier in the same run/scenario
- required artifacts for the target state must exist before the transition is accepted
- violations fail the run as contract/runtime errors (no silent fallback)

Run default live path (Product + Architect + Quant Pattern + Docs Reviewer live, Backend mocked):
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

`--agent-mode` format:
- comma-separated `<agent>=<mode>` pairs
- supported aliases: `product`, `architect`, `quant-pattern`, `backend`, `docs-reviewer`
- canonical ids also supported: `product-agent`, `architect-agent`, `quant-pattern-agent`, `backend-agent`, `docs-reviewer-agent`
- valid modes: `mock`, `live`

Examples:
- `--agent-mode product=live`
- `--agent-mode architect=live`
- `--agent-mode quant-pattern=live`
- `--agent-mode docs-reviewer=live`
- `--agent-mode product=live,architect=live,quant-pattern=live,docs-reviewer=live`

Invalid overrides fail fast:
- unknown agent alias/id
- duplicate agent entries
- invalid mode values
- requesting `live` for agents without a live adapter

Live Product Agent contract:
- OpenAI response must be JSON-only
- output must pass `agent-output-envelope` schema validation
- invalid model output fails the run (no silent repair fallback)
- Product live has an intentional agent-specific extension: `metrics` must include
  `problemStatement`, `scope`, `assumptions[]`, `acceptanceCriteria[]`, `backlogItem`
  for bounded intake quality.

Live Architect Agent contract:
- OpenAI response must be JSON-only
- output must pass `agent-output-envelope` and architect-specific structured validation
- invalid model output fails the run (no silent repair fallback)
- Architect completed outputs must include structured design fields in `metrics`:
  `moduleBoundaries[]`, `dataFlow[]`, `contractDefinitions[]`, `adrDraft`, `riskNotes[]`

Live Quant Pattern Agent contract:
- OpenAI response must be JSON-only
- output must pass `agent-output-envelope` and quant-specific structured validation
- invalid model output fails the run (no silent repair fallback)
- Quant completed outputs must include structured fields in `metrics`:
  `patternDefinition`, `measurableConditions[]`, `metricsPlan[]`, `evaluationHorizon`,
  `invalidationAssumptions[]`, `edgeHypothesis`, `testScenarios[]`
- Phase 1 constraints are enforced:
  spot-only scope, no leverage, no funding-rate dependency, no derivatives assumptions

Live Docs Reviewer Agent contract:
- OpenAI response must be JSON-only
- output must pass `agent-output-envelope` and docs-reviewer-specific structured validation
- invalid model output fails the run (no silent repair fallback)
- Docs Reviewer completed outputs must include structured review fields in `metrics`:
  `docsUpdates[]`, `reviewFindings[]`, `changelogNotes[]`,
  `traceabilityConfirmation.{isTraceable,notes[]}`, `missingArtifactWarnings[]`, `driftWarnings[]`
- reviewer stays bounded to review semantics and cannot bypass workflow artifact enforcement
