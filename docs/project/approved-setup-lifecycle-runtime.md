# Approved setup lifecycle runtime

`@monitor/setup-lifecycle` applies one caller-selected lifecycle action only when a persisted
approval authorizes that exact action. The caller provides the mutator identity, timestamp, and
optional notes; the runtime never infers or schedules a mutation.

The domain handoff remains authoritative for the durable setup-status change and mutation record.
It rejects missing, non-approved, and mismatched authorization before any write. This runtime does
not create refinement requests, revisions, activations, alerts, or trading actions.
