# Pattern-notification eligibility

`@monitor/pattern-notification` decides whether one fresh `SignalCandidate` is eligible to become
an explainable market notification. It joins the current detected state with one explicitly chosen,
completed `SetupAggregateResult` containing historical evaluation evidence.

## Eligibility inputs

- a candidate that is still in `detected` status;
- a completed aggregate for the same setup and compatible monitored-symbol scope;
- the current `consider_long` direction, which is the only direction supported by the implemented
  bullish-breakout evidence;
- current observed price and timestamp; and
- a caller-configured policy with minimum completed evaluations, positive-outcome rate, and average
  percentage move, plus a maximum age for the aggregate evidence.

The runtime returns an in-memory candidate with a deterministic notification ID and deduplication
key based on the signal candidate. It retains the live-price context and the exact historical
metrics that satisfied the policy.

The policy also sets a maximum age for the fresh signal. A bearish/`consider_short` notification
remains out of scope until a bearish detector and direction-aware historical evaluation evidence
are implemented.

## Safety boundary

The direction is decision-support language, not an instruction to buy or sell. This package does
not persist candidates, contact a notification provider, schedule work, access an exchange, or
place orders. Delivery and persistence require a later, separate boundary that records the
deduplication result and delivery outcome.
