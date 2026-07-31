# Execution-attempt runtime

`@monitor/execution-attempt` resolves one prepared envelope, creates its immutable audit input,
and delegates to the domain execution runtime. It uses an injected executor; this package adds no
scheduling, provider adapter, or trading integration.
