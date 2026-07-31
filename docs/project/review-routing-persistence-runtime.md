# Review-routing persistence runtime

`@monitor/review-decision-routing` now persists routable and no-action routing results under their
deterministic routing IDs. Validation and failed outcomes remain transient; retrying a retained
routing ID returns the existing evidence instead of writing a duplicate.
