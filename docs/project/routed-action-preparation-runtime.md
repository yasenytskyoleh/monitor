# Routed-action preparation runtime

`@monitor/routed-action-preparation` resolves one persisted routing result and prepares its
envelope through the domain service. It records an auditable request snapshot, but never dispatches
an action, schedules work, or performs trading.
