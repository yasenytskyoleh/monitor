# ADR-103: Initial Setup Revision Bootstrap Lineage

## Context

Setup revisions were originally modeled only as outputs of an accepted refinement request. A
canonical setup imported for the local BTC pilot needs an accepted version-1 revision and an
activation record, but no earlier setup or genuine refinement decision exists. Creating synthetic
review evidence would weaken the audit trail.

## Decision

Allow `sourceSetupRefinementRequestId` to be absent only for setup-family version 1. Revisions with
version 2 or later continue to require a real refinement-request reference. When the reference is
present, the existing foreign key and lineage validation remain unchanged.

Enforce the version rule in both repository adapters and with a database check constraint. The BTC
pilot seed creates the initial accepted revision without fabricated approval, feedback, or
refinement records.

## Consequences

- canonical setups can be bootstrapped with truthful provenance
- later revision history remains refinement-driven and auditable
- existing rows and revision-creation service behavior remain compatible
- version 1 is the only supported source-free revision case
