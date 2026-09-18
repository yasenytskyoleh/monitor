# ADR-106: Pattern Notification Prisma Schema Layout

## Context

ADR-105 defined `PatternNotificationDurableRecord`. Normally the next rollout step writes the Prisma
model and its migration. Here both already exist: `PatternNotificationRecord` was added by
`20260809103000_product_domain_pattern_notification_relational_v1`, and
`20260901103000_product_domain_pattern_notification_delivery_lease_v1` later added the delivery lease
columns, their CHECK constraint, and a lease-expiry index.

What was missing is the layout contract itself. Every peer entity exports its model names, table
names, required columns, indexes and migration slug from a `…-relational-physical-schema.ts` file,
and the schema-contract test asserts those constants against `schema.prisma` and the migration SQL.
Without that file, nothing verified that the shipped table still matched what the code assumed — the
table could drift from the durable contract and no test would notice.

## Decision

Add `src/storage/pattern-notification-relational-physical-schema.ts` following the peer convention,
and assert it against the real schema and both migrations rather than writing a new migration. The
step is deliberately verification-only: the table already carries all 33 columns the durable contract
names, so introducing a migration would be a no-op with a schema-history cost.

Two deviations from the peer template, both because this entity differs in fact:

- Export two migration slugs. The base table and the delivery lease landed separately, so a single
  slug would misrepresent where the lease columns come from.
- Export `PATTERN_NOTIFICATION_RELATIONAL_CHECK_CONSTRAINTS`. Peers rely on column types and unique
  constraints, but this table enforces its real invariants through eleven CHECK constraints: the
  delivery state machine, timestamp ordering, metric ranges, and the lease fence that ties a
  non-null lease to `delivery_status = 'delivery_attempted'` with an expiry strictly after the
  attempt. Those constraints are the database-level half of the at-most-once guarantee, so the
  adapter in ADR-108 must satisfy them. Naming them makes that a checked fact.

The new tests assert every required column appears both as an `@map` in `schema.prisma` and in the
migration SQL, that all four indexes and the unique and check constraints exist, and that the lease
fence predicate is present.

## Consequences

The physical layout is now pinned. A column rename, a dropped index, or a weakened lease constraint
fails `prisma-physical-schema-contracts.test.ts` instead of surfacing later as a runtime error, and
the next steps can rely on the column set being exactly what the durable contract describes.

The test reads migration files by a path built from the slug constants, so renaming a migration
directory breaks the test. That is intentional; migration directories are immutable once applied.

Verification confirmed no schema change is required, so this step ships no migration. The entity is
still persisted only through the direct Prisma repository, still absent from the shared composition,
and still has no in-memory adapter.

## Follow-up

- ADR-107 — relational adapter port and error taxonomy, plus the in-memory adapter that makes this
  entity testable without Postgres.
- ADR-108 — mappers, adapter-backed repository, and the concrete Prisma adapter.
- ADR-109 — shared implemented-product composition; remove the hand-construction in
  `apps/btc-monitor`.
- ADR-110 — opt-in real-Postgres integration coverage through the shared bundle.
