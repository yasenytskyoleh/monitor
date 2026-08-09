# Refinement-envelope executor

`@monitor/refinement-envelope-executor` executes only prepared
`create_setup_refinement_request` envelopes. The envelope snapshots the reviewer-supplied request
at preparation time: requester, timestamp, rationale, requested changes, and optional evidence
references.

The executor rejects malformed snapshots and mismatched source references, resolves the explicit
persisted approval reference, and permits execution only when that approval authorizes
`refine_definition`. It delegates the exact immutable request to the existing refinement handoff
with the envelope ID as its audit trace. It performs no scheduling, market-provider action,
notification delivery, or trading operation.
