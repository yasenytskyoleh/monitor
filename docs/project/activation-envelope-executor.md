# Activation-envelope executor

`@monitor/activation-envelope-executor` executes only prepared revision-activation envelopes. It
validates the payload against the persisted revision and delegates to the setup activation handoff;
it performs no exchange or trading operation.
