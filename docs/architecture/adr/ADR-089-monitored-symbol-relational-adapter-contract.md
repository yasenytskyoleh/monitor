# ADR-089: Monitored Symbol Relational Adapter Contract

## Status
Accepted

## Context
`monitored_symbol` has a durable contract and committed physical schema, but later repositories need a persistence boundary independent of Prisma.

## Decision
Adopt a durable-record-facing adapter with load, list-by-status, insert, full-update, and status-update operations. Duplicate identifiers, missing updates, and optimistic-version conflicts are deterministic; transient and unknown storage failures remain retryable classifications.

## Consequences
- mapper and repository work can remain independent of Prisma details
- catalog status updates retain the same optimistic-version boundary as the in-memory repository

## Explicitly not included
- mapper, relational repository, or Prisma-adapter implementation
- changes to catalog validation or signal-candidate references

## Follow-up
- implement monitored-symbol mappers, relational repository, and Prisma adapter
