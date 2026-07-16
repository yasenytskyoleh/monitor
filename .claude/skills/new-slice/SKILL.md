---
name: new-slice
description: Guide creating the per-entity persisted-slice file family in packages/domain-model by copy-adapting the most recent slice, flagging which files are mechanical vs. need real per-entity logic, plus the registration checklist. Invoke for "new persisted entity", "scaffold a slice", or /new-slice <EntityName>.
disable-model-invocation: true
---

# new-slice

Guide adding a new durable-persisted entity to `packages/domain-model`. This is **copy-adapt from the most recent slice, then rename**, not blind generation — the two large adapter files carry real per-entity reference-validation logic that must be written, not templated.

## Input
`/new-slice <EntityName>` — e.g. `/new-slice SetupRevisionActivationRecord`. Derive the snake_case entity type (`setup_revision_activation_record`) and kebab file prefix (`setup-revision-activation-record`). If missing, ask.

## First: pick the template
The **most recently completed** slice is the best template (conventions drift forward). Find it via `git log` / file mtimes; the current reference is the `setup-revision-activation-record-*` family. The original `first-durable-relational-*` files are the canonical template but predate later refinements — prefer the newest complete slice.

## The file family (all under `packages/domain-model/src/`)
Copy each from the template slice, then global-rename the entity. Marked **[LOGIC]** files need genuine per-entity work after renaming; **[mech]** are near-mechanical.

| File | Notes |
|---|---|
| `storage/<prefix>-relational-slice.ts` | **[LOGIC]** define the `DurableRecord` fields for this entity |
| `storage/<prefix>-relational-physical-schema.ts` | **[LOGIC]** column/table layout |
| `repositories/<prefix>-repository.ts` | **[LOGIC]** domain repo interface (operations) |
| `repositories/<prefix>-relational-repository-adapter.ts` | **[LOGIC]** adapter port + error taxonomy (`already_exists`/`not_found`/`version_mismatch`/`invalid_reference`/`transient_failure`/`unknown_failure`) |
| `repositories/<prefix>-relational-repository-mappers.ts` | **[LOGIC]** `dehydrate*`/`hydrate*` field mapping |
| `repositories/<prefix>-relational-repository-adapter.impl.ts` | **[LOGIC, large]** in-memory adapter + all reference-existence validation |
| `repositories/<prefix>-relational-prisma-adapter.ts` | **[LOGIC, largest]** Prisma adapter — real SQL/reference checks; the heaviest file |
| `repositories/<prefix>-relational-repository.impl.ts` | **[mech]** thin repo holding only the adapter |
| `repositories/<prefix>-relational-repositories.ts` | **[mech]** `compose…RelationalRepositories(adapter)` factory |
| `repositories/<prefix>-relational-prisma-client.ts` | **[mech]** per-slice Prisma wiring |
| `test/<prefix>-*.test.ts` / `.integration.test.ts` | **[LOGIC]** contract + integration tests |

## Registration checklist (easy to miss — verify each)
After the files exist, register the entity in:
- [ ] `prisma/schema.prisma` — add the model, then create the migration:
      `pnpm --filter @monitor/domain-model exec prisma migrate dev --config prisma.config.ts`
- [ ] `src/storage/storage-boundary.ts` — `PRODUCT_PERSISTED_ENTITY_TYPES`
- [ ] `src/storage/persisted-entity.ts` — `FIRST_CLASS_PERSISTED_ENTITY_PROFILES`
- [ ] `src/repositories/implemented-product-relational-repositories.ts` — unions/composer
- [ ] `src/repositories/implemented-product-relational-prisma-client.ts` — Prisma wiring
- [ ] `src/index.ts` — re-export every new public symbol (the barrel IS the public API)

## Process discipline
This is **six PR-sized slices, not one** — do not scaffold all layers at once. Follow the rollout order and write one ADR + one commit per step (use `/new-adr <entity> <stage>`). In-memory adapter lands before the Prisma adapter. After each step, run `/verify-slice`.

Start by confirming the template slice, then create step-1 files (`-relational-slice.ts` contract) only, and stop for review.
