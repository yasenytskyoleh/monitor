# ADR-108: Pattern Notification Adapter-Backed Relational Repositories

## Context

ADR-107 defined the port and an in-memory adapter. Nothing used them: the domain interface
`PatternNotificationRecordRepository` was still satisfied only by
`PatternNotificationRecordPrismaRepository`, which maps Prisma rows straight to domain objects.

## Decision

Add the three pieces that connect the port to both sides:

- **Mappers.** `dehydratePatternNotificationToDurableRecord` /
  `hydratePatternNotificationFromDurableRecord` translate between the domain record's optional
  properties and the durable record's explicit nulls, and rebuild `identity.relatedEntityIds` from
  the five evidence references.
- **`RelationalPatternNotificationRecordRepository`.** Implements the domain interface while holding
  only the port. It preserves the existing update semantics exactly: load current, run
  `assertPatternNotificationEvidenceIsUnchanged`, default `expectedVersion` to the stored version,
  and write at `current.version + 1`.
- **`PrismaPatternNotificationRelationalRepositoryAdapter`.** Implements the port over Prisma, with
  the peer error taxonomy — `P2002` to `already_exists`, the transient code set to
  `transient_failure`, everything else to `unknown_failure`.

**This step uncovered a real integrity gap.** `pattern_notification` has **no foreign keys**, while
peer tables have them — `setup_revision_activation_record` has four. Postgres therefore does not
enforce that a notification's signal candidate, setup, revision, symbol, or aggregate exists, and no
`P2003` can ever be raised for this table. Had the Prisma adapter simply followed the peer template,
it would have silently accepted evidence the in-memory adapter rejects, and the two adapters would
have disagreed under the same contract tests.

The adapter therefore checks the five references explicitly before writing, using the same
`referenceExists` shape ADR-107 introduced, implemented as a `select`-narrowed `findUnique` per
reference. Adding the missing foreign keys is the better long-term fix, but it is a schema change
against a table that already holds rows, so it belongs in its own slice with its own backfill
check rather than being smuggled into this step.

## Consequences

The entity can now be persisted through the port against either adapter, and the two agree on
`already_exists`, `not_found`, `version_mismatch`, and `invalid_reference`. Twenty-two new tests
cover the mappers, the repository, and the Prisma adapter, none of which need a database.

The explicit reference check costs five existence queries per insert and is not atomic with the
write: a referenced row deleted between check and insert would still be accepted. That is strictly
better than today's behaviour, which never checks at all, but it is not equivalent to a foreign key.
The gap closes only when the constraints are added.

`PatternNotificationRecordPrismaRepository` still exists and is still what `apps/btc-monitor`
constructs. Nothing is wired to the new repository yet, so this step changes no runtime behaviour.

## Follow-up

- ADR-109 — compose the Prisma adapter into the shared implemented-product bundle and delete the
  hand-construction in `apps/btc-monitor`.
- ADR-110 — opt-in real-Postgres integration coverage through that bundle.
- Separately: add the missing `pattern_notification` foreign keys, after checking existing rows
  satisfy them. Tracked in `docs/project/next-steps.md`.
