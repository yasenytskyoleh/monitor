# ADR-109: Implemented Product Pattern Notification Composition

## Context

After ADR-108 the entity had a port, two adapters, and a repository, but nothing used them.
`apps/btc-monitor` still built its own persistence in three entrypoints — `index.ts`, `notify.ts`,
and `smoke.ts` — each spreading the shared bundle and then overriding
`patternNotificationRecordRepository` with a hand-constructed
`PrismaPatternNotificationRecordRepository`. A second standalone composition root,
`pattern-notification-record-repository.prisma-client.ts`, existed for the same purpose and was used
by nothing.

Three call sites constructing persistence by hand is how the entity drifted out of the pattern in the
first place.

## Decision

Add `composePatternNotificationRelationalRepositories` and the per-slice Prisma client, then wire the
adapter into `ImplementedProductRelationalAdapters` and
`createImplementedProductRelationalPrismaAdapters` exactly as the other fifteen adapters are wired.
The shared bundle now exposes `patternNotificationRecordRepository`, so all three entrypoints simply
pass `repositories` through.

Delete both legacy files: `pattern-notification-record-repository.prisma.ts` and
`pattern-notification-record-repository.prisma-client.ts`, along with their barrel exports. Keeping a
second, subtly different implementation of the same repository would preserve exactly the divergence
this rollout set out to remove — ADR-108 already showed the two disagreeing on reference validation.
Nothing outside `packages/domain-model` referenced either file.

## Consequences

There is now one way to persist a pattern notification, composed like every peer, and swapping the
in-memory adapter for Prisma is a composition choice rather than a code change. The shared-bundle
test asserts the repository is present, so a future slice cannot quietly drop it.

**This changes runtime behaviour**, deliberately. Retention previously wrote without checking that
the referenced candidate, setup, revision, symbol, and aggregate existed; it now rejects a dangling
reference with `invalid_reference`. In the real flow those records are written or read immediately
beforehand, so the check should never fire — but it converts a silent orphan into a loud failure. The
cost is five existence queries per retained notification, on a path that runs at most once per
detected candidate.

Removing the two legacy exports is a breaking change to the package's public barrel. There are no
consumers outside this repository, and both symbols are fully replaced.

The foreign keys this table still lacks remain the outstanding integrity gap from ADR-108.

## Follow-up

- ADR-110 — opt-in real-Postgres integration coverage for this entity through the shared bundle,
  completing the six-step rollout.
- Separately: add the missing `pattern_notification` foreign keys, tracked in
  `docs/project/next-steps.md`.
