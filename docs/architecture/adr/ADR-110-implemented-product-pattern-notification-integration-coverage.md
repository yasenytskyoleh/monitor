# ADR-110: Implemented Product Pattern Notification Integration Coverage

## Context

ADR-109 put `pattern_notification` in the shared bundle, but nothing exercised it against a real
database. The containerized smoke run that verified the rewiring retained no notification at all,
because the BTC aggregate currently fails the evidence policy — 44.7% positive outcomes and a
-0.513% average move against thresholds of 60% and +0.5%. Detection and candidate persistence were
proven; the durable notification write path was not.

The reason it had never been covered turned out to be mechanical:
`implemented-product-relational-repositories.integration.test.ts` rebuilds the schema from a
hand-maintained list of migration paths, and that list stopped at `20260728100000`. Both
`pattern_notification` migrations were missing, so the table did not exist in the integration
database and any test touching it would have failed.

## Decision

Add the two missing migrations to the list and extend the existing full-chain integration test
through the delivery lifecycle: retain a notification, reject a duplicate for the same signal
candidate, claim it under a lease, record a terminal outcome, and read it back by deduplication key.
Assert the durable row reaches `version` 3 with status `delivered`.

Add a second test proving a dangling evidence reference is rejected and leaves no row behind — the
behaviour that has to exist in the adapter because this table has no foreign keys.

**This uncovered a divergence between the two adapters.** Postgres rejected the terminal write with
`pattern_notification_delivery_lease_consistent`: a lease may exist only while a delivery is in
flight, so a terminal outcome must drop it. The in-memory adapter accepted the same write. ADR-107
claimed the contract tests keep the two honest, and that claim was false for this rule. The
in-memory adapter now enforces the lease invariant too, and a contract test covers it.

## Consequences

The six-step rollout is complete. `pattern_notification` now has the full file family, shared-bundle
composition, and end-to-end real-Postgres coverage, and its at-most-once delivery lifecycle is
verified against the database that enforces it. The entity is no longer the exception in this
package.

The in-memory adapter now rejects a terminal write that keeps its lease. Two tests written against
the looser behaviour were wrong and were corrected; the service layer already dropped the lease, so
no runtime path changes.

The migration list in the integration test remains hand-maintained, and it silently excluded this
entity for two slices. It is the same failure mode as the hand-maintained documentation inventories,
and the next entity added will hit it again. Reading the migrations directory in sorted order would
remove the class of bug; that is left out here because the `runtime_control` migration is not
idempotent against an existing schema and needs its own handling.

## Follow-up

- Add the missing `pattern_notification` foreign keys, after checking existing rows satisfy them.
- Replace the hand-maintained migration list in the integration test with a directory read.
Both are tracked in `docs/project/next-steps.md`.
