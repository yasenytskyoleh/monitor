# Crypto Monitoring Foundation Note — v0.1

## Status Note

This file is the original foundation memo for the project.

The current repo now operates through a **Codex-first workflow**:
- Codex is the primary day-to-day operator for planning, implementation, and repo coordination
- the internal orchestration subsystem remains in the repo as a constrained supporting subsystem

For current source-of-truth status and roadmap, prefer:
- `docs/project/project-overview.md`
- `docs/project/current-phase.md`
- `docs/project/next-steps.md`
- `docs/project/decisions-log.md`

## Goal

Build an agent-assisted crypto monitoring platform that:

* ingests market data,
* detects rule-based patterns,
* enriches signals with news/context,
* stores statistics across patterns,
* helps the user evaluate which setups have real edge.

This is **not** an autonomous trading bot. The system is primarily a research, monitoring, and decision-support platform.

---

## Phase 1 Objective

Start by organizing the agent system so development stays structured and repeatable.

Primary outcome of Phase 1:

* clear agent roles,
* shared knowledge structure,
* workflow for changes,
* first implementation sprint defined.

---

## Principles

1. Rules first, AI second.
2. Docs are source of truth.
3. Every agent must have a narrow role.
4. No agent changes architecture silently.
5. Every non-trivial change updates docs.
6. Every signal must be testable statistically.
7. Human review remains the final gate.

---

## First 5 Agents

### 1. Product Agent

**Purpose:** turns ideas into structured work.

**Inputs:**

* feature idea,
* research question,
* bug report,
* user change request.

**Outputs:**

* problem statement,
* scope,
* acceptance criteria,
* backlog item,
* priority.

**Must not:**

* write production code,
* invent architecture independently.

---

### 2. Architect Agent

**Purpose:** defines boundaries and technical decisions.

**Inputs:**

* approved scope,
* current docs,
* existing architecture decisions.

**Outputs:**

* module design,
* ADR draft,
* data-flow notes,
* API/service boundaries,
* risk notes.

**Must not:**

* implement large code changes directly,
* bypass documented decisions.

---

### 3. Backend Agent

**Purpose:** implements approved backend tasks.

**Inputs:**

* approved task,
* relevant ADR,
* existing module boundaries.

**Outputs:**

* NestJS code,
* Prisma schema updates,
* jobs/queues,
* tests,
* implementation notes.

**Must not:**

* create new domain concepts without doc update,
* change contracts silently.

---

### 4. Quant/Pattern Agent

**Purpose:** formalizes patterns and evaluates signal quality.

**Inputs:**

* raw idea for setup,
* indicator/pattern definition,
* market behavior hypothesis.

**Outputs:**

* pattern definition,
* measurable conditions,
* outcome metrics,
* test scenarios,
* performance interpretation.

**Must not:**

* use vague pattern descriptions,
* mark a setup as useful without measurable criteria.

---

### 5. Docs/Reviewer Agent

**Purpose:** keeps docs and implementation aligned.

**Inputs:**

* merged changes,
* ADRs,
* updated backlog,
* implementation notes.

**Outputs:**

* updated docs,
* missing-doc warnings,
* review comments,
* release notes / changelog notes.

**Must not:**

* approve incomplete work without required docs.

---

## Shared Workflow

### Step 1 — Intake

A new idea enters as:

* feature,
* architecture change,
* pattern research item,
* infrastructure task.

Handled by: **Product Agent**

### Step 2 — Design

The change is shaped into architecture, contracts, and impact.

Handled by: **Architect Agent**

### Step 3 — Formalization

If it involves signals/patterns, define measurable rules.

Handled by: **Quant/Pattern Agent**

### Step 4 — Implementation

Build the approved scope.

Handled by: **Backend Agent**

### Step 5 — Review and Sync

Verify consistency, update docs, record decision.

Handled by: **Docs/Reviewer Agent**

---

## Canonical Knowledge Structure

```text
/docs
  /product
    vision.md
    scope.md
    backlog.md
    requirements.md
  /architecture
    system-overview.md
    modules.md
    event-flow.md
    data-model.md
    adr/
  /patterns
    pattern-template.md
    gap-detection.md
    continuation.md
    reversal.md
    scoring.md
  /agents
    roles.md
    workflows.md
    guardrails.md
    prompts.md
  /ops
    setup.md
    runbooks.md
    environments.md
```

---

## Initial Technical Direction

### Core stack

* NestJS
* Prisma
* PostgreSQL
* Redis
* BullMQ

### Likely modules later

* market-data
* pattern-engine
* signal-store
* score-engine
* news-enrichment
* alerting
* backtest / evaluation

---

## First Sprint Proposal

### Sprint 0 — Agent Foundation

**Goal:** establish structure before writing real trading logic.

#### Tasks

1. Create docs structure.
2. Write agent roles and guardrails.
3. Create ADR template.
4. Create task template.
5. Define first technical backlog.
6. Define first market-data spike.

#### Deliverables

* initial `/docs` tree,
* roles document,
* workflow document,
* first ADR,
* first backlog.

---

## First ADR Candidate

**ADR-001: System positioning**

Decision:

* The product is a crypto monitoring and research platform, not an auto-trading bot.
* Signal generation is rule-based in the first phase.
* AI is allowed for documentation, summarization, research assistance, and later news enrichment.

Reason:

* easier validation,
* lower complexity,
* easier testing,
* cheaper iteration.

---

## First Backlog Candidates

1. Define agent prompts and rules.
2. Create repo docs skeleton.
3. Define first domain entities.
4. Choose first market data source.
5. Define first 2 pattern hypotheses.
6. Design signal outcome measurement.

---

## First Task To Execute

**Task-001: Define agent operating rules**

Acceptance criteria:

* each agent has clear purpose,
* each agent has allowed inputs/outputs,
* escalation points are defined,
* no overlapping ownership for architecture decisions.

---

## Locked Decisions

1. Day-to-day work runs through a Codex-first workflow; the internal orchestrator remains a supporting subsystem in the repo.
2. The project will use a monorepo from the start.
3. News enrichment is postponed until after the signal/statistics foundation is in place.
4. The first market focus is spot only.

## Implications of These Decisions

### Codex-first workflow

* Codex is the primary operator for planning, implementation, and repo coordination,
* agent roles and outputs should still be defined as machine-readable contracts,
* automated workflows should remain state-driven,
* handoffs must be explicit,
* prompts should be portable and not tied to a single IDE tool.

### Monorepo direction

Recommended top-level areas:

* apps/
* packages/
* docs/
* tooling/

### Scope control

By delaying news enrichment:

* Phase 1 stays focused on market data, pattern logic, outcomes, and statistics,
* lower complexity,
* easier validation,
* reduced token and infrastructure cost.

### Spot-first direction

Phase 1 should avoid:

* funding-rate logic,
* open-interest dependencies,
* futures liquidation assumptions,
* leverage-specific scoring.

This keeps the initial domain cleaner and easier to validate.

## Recommended Immediate Next Step

Write these 5 files first:

* `/docs/agents/roles.md`
* `/docs/agents/workflows.md`
* `/docs/agents/guardrails.md`
* `/docs/architecture/adr/ADR-001-system-positioning.md`
* `/docs/architecture/adr/ADR-002-scope-phase-1-spot-only.md`

Only after that start implementation planning.

---

## Next Concrete Document To Create

`/docs/agents/roles.md`

It should define for each agent:

* mission,
* allowed inputs,
* required outputs,
* forbidden actions,
* escalation points,
* success criteria.

This should become the first operational contract for the internal orchestration subsystem.
