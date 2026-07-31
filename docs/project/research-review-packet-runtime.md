# Research review-packet runtime

`@monitor/review-packet` is a read-only wrapper around the domain review-packet builder. Callers
provide a setup family, build timestamp, and optional revision/evidence references; the domain
service resolves packet context and reports whether it is complete, partial, or insufficient.

This package records no decision, route, approval, lifecycle mutation, or trading action.
