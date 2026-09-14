# Lifecycle-envelope executor

`@monitor/lifecycle-envelope-executor` executes only prepared lifecycle-mutation envelopes that
carry an explicit persisted approval reference. It validates the immutable payload and approval
lineage, derives the lifecycle action from the approved record, and delegates to the existing
domain mutation handoff. It performs no scheduling, provider action, or trading operation.
