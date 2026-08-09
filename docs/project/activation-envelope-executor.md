# Activation-envelope executor

`@monitor/activation-envelope-executor` executes only prepared revision-activation envelopes. It
requires the immutable payload snapshot to match the envelope's target and source references,
validates the payload against the persisted revision, and delegates to the setup activation handoff.
It performs no exchange or trading operation.
