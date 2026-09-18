# ADR-107: Pattern Notification Relational Adapter Contract

## Context

ADR-105 and ADR-106 pinned what a `pattern_notification` row is and where it lives. Neither changed
how the entity is reached: `PatternNotificationRecordPrismaRepository` still talks to Prisma
directly, so there is no seam between the entity's rules and Postgres. Its persistence rules — one
retained alert per signal candidate, and a delivery transition that only the caller holding the
current state may apply — could not be exercised without a live database, and were therefore the
only such rules in the package with no test of their own.

That matters more here than for a peer entity. These rules are what make a user-facing alert
at-most-once. A race that silently overwrote a claim would send a second Telegram message.

## Decision

Add `PatternNotificationRelationalRepositoryAdapter` with five operations — load by id, load by
deduplication key, list by delivery status, insert, update — and the standard error taxonomy split
into deterministic (`already_exists`, `not_found`, `version_mismatch`, `invalid_reference`) and
retryable (`transient_failure`, `unknown_failure`) codes.

The update request carries three optional guards rather than one:

- `expectedVersion` for ordinary optimistic concurrency,
- `expectedDeliveryStatus`, so a claim applies only from the status the caller read,
- `expectedDeliveryAttemptedAtUtc`, so a terminal outcome applies only to the attempt it belongs to.

A failed guard raises `version_mismatch`, never a silent no-op. Losing a race must be observable, or
the caller cannot tell a completed send from a lost one. This mirrors the database's
`pattern_notification_delivery_lease_consistent` CHECK constraint at the port level, so the
in-memory adapter and Postgres agree.

`InMemoryPatternNotificationRelationalRepositoryAdapter` implements the port over a map, validating
all five evidence references, enforcing the deduplication key as the unique constraint does, and
returning `structuredClone`d records so stored evidence cannot be mutated through a caller's
reference.

One deviation from the peer template: the reference reader exposes
`referenceExists(kind, entityId)` rather than five `load…Record` methods. Peer adapters read fields
from the records they load; this one only needs to know the reference resolves. Asking exactly that
lets the Prisma adapter answer with an existence query instead of loading five full rows per insert,
and keeps the test double free of casts to record types it never populates.

## Consequences

This entity's persistence rules are now testable without Postgres, and twelve contract tests cover
them — including the case that matters most: a second claimer that still believes the record is
pending is rejected, and the winner's lease survives untouched.

The in-memory adapter enforces the deduplication key and the delivery guards in application code,
while Postgres enforces them with a unique index and CHECK constraints. Two implementations of one
rule can diverge; the contract tests in ADR-108 run against both to keep them honest.

Nothing consumes this port yet. `PatternNotificationRecordPrismaRepository` is still the only way
this entity reaches Postgres, the entity is still absent from the shared composition, and
`apps/btc-monitor` still hand-constructs its repository.

## Follow-up

- ADR-108 — mappers between the domain record and the durable record, the adapter-backed
  repository, and the concrete Prisma adapter, run against the same contract tests.
- ADR-109 — shared implemented-product composition; remove the hand-construction in
  `apps/btc-monitor`.
- ADR-110 — opt-in real-Postgres integration coverage through the shared bundle.
