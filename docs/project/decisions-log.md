# Decisions Log

## Core product and scope decisions
- Monitor is an **agent-assisted crypto monitoring and research platform**
- Phase 1 is about the **orchestration foundation**, not a trading platform
- current market scope is **spot only**
- news enrichment should come **after** signal/statistics foundation
- the project uses a **monorepo from the start**
- agents are expected to run mainly through an **own orchestrator later**

## Architectural decisions
- docs are the human-readable contract layer
- YAML configs are the editable operational layer
- JSON Schemas are the machine-validation layer
- runtime code must enforce rules rather than relying on prompts alone
- the system should be **fail-closed by default**
- approval-gated transitions must not be bypassed
- persisted workflow artifacts are part of the platform foundation
- live agents should be introduced **incrementally**, one by one

## Agent/workflow decisions
- current core agents:
  - Product Agent
  - Architect Agent
  - Backend Agent
  - Quant Pattern Agent
  - Docs Reviewer Agent
- current main workflow:
  `INTAKE -> DESIGN -> FORMALIZE -> IMPLEMENT -> REVIEW -> APPROVAL -> PUBLISH_SIGNAL -> DONE`
- invalid transitions must fail
- missing approvals should lead to controlled rejection
- no silent downgrade from live to mock

## Progress decisions already realized
- mocked workflow runner exists
- first live Product Agent path exists
- live Architect Agent path exists
- live Quant Pattern Agent path exists
- live Docs Reviewer Agent path exists
- first constrained live Backend Agent path exists
- backend isolated apply + verification + cleanup flow exists
- backend controlled promotion flow exists (`promote_verified`)
- narrow helper-file creation constraints exist (including json helper fixtures)
- backend stability reassessment artifact exists for dedicated runs (`stability-reassessment.json`)
- persisted run artifacts exist
- per-agent mode selection exists
- approval registry and transition-bound approval validation exist
- approval expiry and revocation checks are enforced
- artifact registry and role-based artifact allowlists exist
- shared live-adapter execution pipeline exists
- per-run approvals are persisted (`approvals.json`)

## Current next-step decision
- the currently recommended next step is **post-reassessment consolidation before any further Backend scope expansion**
