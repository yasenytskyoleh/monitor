# ADR-098: Application-Flow Terminal Evaluation Outcomes

## Context

The setup-to-aggregate flow could only finalize an evaluation as `completed`. ResearchRun now
accepts all terminal evidence, but application callers could not use the same composed path for
expired or invalidated evaluations.

## Decision

Make the evaluation input a terminal-outcome union. Callers may provide the existing completion
payload, an expiration, or an invalidation with optional notes. The flow invokes the matching
service operation before recording the result in the ResearchRun and recomputing the aggregate.

## Consequences

- the flow preserves its existing completion input for current callers
- expired and invalidated evaluation results are durably associated with the run
- aggregates with no usable completed result become `invalid`, while the workflow itself finishes
  successfully because all requested operations completed
