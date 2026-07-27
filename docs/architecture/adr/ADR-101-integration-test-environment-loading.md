# ADR-101: Integration Test Environment Loading

## Context

Prisma generation loaded the workspace `.env`, but the Node integration-test process did not.
As a result, a configured `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL` was silently ignored and all
real-Postgres tests were skipped.

## Decision

Load the workspace `.env` with Node's `--env-file` option in the domain-model integration-test
script.

## Consequences

- configured integration tests execute instead of silently skipping
- the disposable-database guard remains enforced by the integration helper
- a missing or unreachable configured database now fails visibly
