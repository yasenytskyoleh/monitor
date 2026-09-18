# ADR-105: Pattern Notification Durable Relational Contract

## Context

`pattern_notification` is a member of `PRODUCT_PERSISTED_ENTITY_TYPES` and has had a Prisma model and
migrations since `20260809103000`, but it never received the durable relational contract that every
other persisted product entity carries. It reached Postgres through
`PatternNotificationRecordPrismaRepository`, which reads and writes generated Prisma payload types
directly, with no `…DurableRecord` in between and no in-memory adapter.

The consequences are concrete. The entity is absent from the shared implemented-product composition,
so `apps/btc-monitor` hand-constructs the repository in three entrypoints. It has no dedicated test in
`packages/domain-model`, and no opt-in real-Postgres integration coverage. Because there is no port,
its persistence cannot be exercised at all without a live database.

This is the first of six steps that bring the entity onto the same rollout every peer already follows.

## Decision

Define `PatternNotificationDurableRecord` in `src/storage/pattern-notification-relational-slice.ts` as
`DurableRelationalRecordBase<"pattern_notification">` plus the entity's own columns. It keeps the
standard `product_domain` identity, lifecycle, metadata, archive, schema-version, and
optimistic-version fields, and follows the existing convention of `…AtUtc` names and explicit `null`
rather than the optional properties the domain type uses.

Split the entity's own fields into two named groups, because the distinction is a real invariant
rather than documentation:

- `PATTERN_NOTIFICATION_DURABLE_EVIDENCE_FIELDS` — the deduplication key, the candidate, setup,
  revision, symbol, and aggregate references, the direction, and the observation and aggregate
  evidence. These are captured when the notification becomes eligible and never change afterwards.
- `PATTERN_NOTIFICATION_DURABLE_DELIVERY_FIELDS` — delivery status, attempt time, lease id and
  expiry, completion time, and outcome code. These are the only fields a later step may update, and
  only through the owning service.

`identity.relatedEntityIds` snapshots the candidate, setup, revision, symbol, and aggregate ids it
was derived from. As with every peer slice, it is reconstructed by mappers rather than stored as a
column.

This step adds the contract only. It does not change how anything is persisted today.

## Consequences

The entity now has the vocabulary its peers have, so the remaining steps can follow the standard
rollout instead of inventing a parallel shape. The evidence/delivery split becomes a compile-time
fact that the adapter contract in ADR-107 can enforce, rather than a rule restated in prose.

`assertPatternNotificationEvidenceIsUnchanged` in the existing repository port still guards the same
invariant over domain objects. The two lists must agree until the adapter-backed repository replaces
that check; nothing yet prevents them drifting apart.

The direct `PatternNotificationRecordPrismaRepository` path remains the only way this entity reaches
Postgres, `apps/btc-monitor` still hand-constructs it, and there is still no in-memory adapter,
shared-bundle wiring, or integration coverage. Those stay out of scope here.

## Follow-up

- ADR-106 — verify the physical schema against the existing model and migrations, and add
  `storage/pattern-notification-relational-physical-schema.ts`. No new migration is expected, because
  the table already carries every column this contract names.
- ADR-107 — relational adapter port and error taxonomy, plus the in-memory adapter.
- ADR-108 — mappers, adapter-backed repository, and the concrete Prisma adapter.
- ADR-109 — shared implemented-product composition; remove the hand-construction in
  `apps/btc-monitor`.
- ADR-110 — opt-in real-Postgres integration coverage through the shared bundle.
