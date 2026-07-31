# Setup revision proposal runtime

`@monitor/setup-revision` turns one persisted refinement request into an explicit revision
proposal. It derives the setup identity from the request, requires caller-supplied proposed changes,
and delegates all revision validation and persistence to the existing domain handoff.

It does not mark refinement requests reviewed, activate revisions, mutate setup lifecycle, or trade.
