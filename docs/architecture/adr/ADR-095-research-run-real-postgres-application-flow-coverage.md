# ADR-095: Research Run Real-Postgres Application-Flow Coverage

## Context

The durable repository bundle had real-Postgres coverage for a manually seeded ResearchRun, but
the repository-composed setup-to-aggregate application flow was only verified in memory.

## Decision

Add an opt-in real-Postgres integration test that composes the application flow from the shared
Prisma repository bundle. The test creates the monitored symbol prerequisite, runs the complete
ResearchRun path, and verifies both repository reads and the durable row after aggregation.

The test remains gated by `PRODUCT_DOMAIN_INTEGRATION_DATABASE_URL`, matching the project's
existing database integration policy.

## Consequences

- application-level composition is covered against the same migrations as repository adapters
- deployment validation can exercise a completed ResearchRun rather than a manually seeded row
- enabling durable runtime writes still requires the configured target database and migration
  workflow
