---
name: new-adr
description: Scaffold the next architecture decision record in docs/architecture/adr following this repo's fixed sections, numbering, and 6-step persistence-rollout Follow-up chain. Invoke for "new ADR", "scaffold an ADR", or /new-adr <entity> <stage>.
disable-model-invocation: true
---

# new-adr

Scaffold the next ADR under `docs/architecture/adr/` matching this repo's exact convention. Do **not** invent content — pre-fill structure and copy the wording style from recent ADRs of the same entity, leaving `TODO` markers for the author.

## Inputs
`/new-adr <entity> <stage>` — e.g. `/new-adr setup-revision-activation-record durable-relational-contract`.
If either is missing, ask.

## The fixed 6-step rollout (stage → title suffix → filename shape)
One ADR + one commit per step, in this order:

| # | `<stage>` | Title suffix | Filename slug |
|---|-----------|--------------|---------------|
| 1 | `durable-relational-contract` | Durable Relational Contract | `<entity>-durable-relational-contract` |
| 2 | `prisma-schema-layout` | Prisma Schema Layout | `<entity>-prisma-schema-layout` |
| 3 | `relational-adapter-contract` | Relational Adapter Contract | `<entity>-relational-adapter-contract` |
| 4 | `adapter-backed-relational-repositories` | Adapter-Backed Relational Repositories | `<entity>-adapter-backed-relational-repositories` |
| 5 | `composition` | Composition | `implemented-product-<short-entity>-composition` |
| 6 | `integration-coverage` | Integration Coverage | `implemented-product-<short-entity>-integration-coverage` |

Note: steps 5–6 use the `implemented-product-` prefix and often a shortened entity form (e.g. `setup-revision-activation` not `setup-revision-activation-record`). **Match the exact form used by that entity's earlier ADRs** — grep for them first.

## Steps

1. **Find the next number.** List `docs/architecture/adr/`, take the highest `ADR-NNN`, add 1, zero-pad to 3 digits.
2. **Pattern-match the entity.** `grep` existing ADRs for `<entity>` to copy the exact title casing, the short-entity form for steps 5–6, and the Follow-up wording style.
3. **Pick the section heading for the 5th section.** The **`relational-adapter-contract` stage** uses `## Explicitly postponed at this contract step`. **Every other stage** uses `## Explicitly not included`.
4. **Write the Follow-up chain.** List the remaining later steps for this entity, each naming the ADR number it will land in (compute them as consecutive numbers after this one). The final integration-coverage ADR instead points forward to the next entity's end-to-end integration work — copy that style from the most recent step-6 ADR.
5. **Write the file** `ADR-<NNN>-<slug>.md` using the template below. Fill Context/Decision with `TODO` bullets tailored to the stage; keep Status as `Accepted` only if the author confirms — otherwise `Proposed`.

## Template
```markdown
# ADR-<NNN>: <Entity Title> <Title suffix>

## Status
Proposed

## Context
<TODO: what already exists (prior steps), and the specific gap this step closes.>

## Decision
<TODO: the contract/decision rules for this step.>

## Consequences
Positive:
- <TODO>

Tradeoffs:
- <TODO>

## <Explicitly not included | Explicitly postponed at this contract step>
- <TODO: later steps deliberately out of scope here.>

## Follow-up
- <TODO: each remaining step for this entity → the ADR number it lands in.>
```

After writing, print the path and remind the author this is one slice = one commit (capitalized imperative one-liner naming entity + stage, e.g. "Add setup-revision-activation-record durable relational contract").
