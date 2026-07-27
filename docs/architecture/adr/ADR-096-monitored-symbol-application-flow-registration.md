# ADR-096: Monitored Symbol Application-Flow Registration

## Context

Signal-candidate creation validates that its monitored symbol already exists. The composed
setup-to-aggregate flow therefore depended on callers to seed the catalog outside the flow,
despite the flow already owning the candidate's prerequisite sequence.

## Decision

Allow `SetupToAggregateFlowInput` to include an optional monitored symbol. When provided, the
flow validates that it matches the candidate, registers it after hypothesis linking, and records
the symbol ID before candidate creation. The repository-composed factory supplies the catalog
service automatically.

## Consequences

- callers can create a complete candidate-to-aggregate path without a separate catalog write
- existing callers can continue supplying a pre-existing symbol and omit the optional input
- mismatched symbol and candidate identifiers fail before any product write
