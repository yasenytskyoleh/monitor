# Setup Superseding Strategy

## Core rule
When a new accepted revision becomes active:
- previous active revision is superseded
- previous setup definition is retained for history
- historical revision records are never deleted or silently rewritten

## Operational behavior (first version)
- target revision activation sets target setup-definition status to `active`
- previous active setup-definition transitions out of `active` (`paused`)
- previous active revision status becomes `superseded`
- activation is recorded in `SetupRevisionActivationRecord`

## Already-active behavior
If target revision is already active:
- return `already_active`
- keep lineage unchanged
- record activation event for auditability

## Failure boundaries
Reject activation when:
- target revision is missing
- target revision is not `accepted`
- setup family/linkage selector is invalid
- multiple active revisions already exist for the family

Unexpected persistence/runtime failures return `failed` with retry guidance.
