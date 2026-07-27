# ADR-100: Terminal Evaluation Real-Postgres Flow Coverage

## Context

The repository-composed real-Postgres test covered completed evaluation outcomes. Expired and
invalidated outcomes were verified only through in-memory flow composition.

## Decision

Add environment-gated real-Postgres coverage for expired and invalidated application-flow inputs.
Each test verifies the terminal evaluation, completed ResearchRun evidence, invalid aggregate, and
durable ResearchRun row.

## Consequences

- all terminal flow outcomes have equivalent durable integration coverage
- the integration suite validates operational completion separately from aggregate validity
- coverage remains opt-in until a target database URL is configured
