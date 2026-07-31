# Research review-decision runtime

`@monitor/review-decision` records an explicit human decision for a review packet. Callers supply
the reviewer, outcome, and optional authorized next action; the domain service validates linkage
and allowed actions. It does not generate decisions or route them downstream.
