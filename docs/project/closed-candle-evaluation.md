# Closed-Candle Evaluation

## Purpose

`@monitor/candle-evaluation` completes a persisted signal candidate from normalized closed candles
without depending on an exchange adapter. The pilot evaluates one 5m detection candle plus the
following contiguous 24-hour window.

## Evaluation behavior

- The detection-candle close is the reference price and must match the candidate detection time and
  canonical symbol.
- The window contains exactly 288 contiguous 5m candles from the same source and symbol, ending at
  the exact 24-hour boundary.
- The runtime derives high, low, final close, and favorable/adverse excursions, then uses the
  existing candidate-to-evaluation handoff and evaluation service to persist completion.
- A completed result advances the candidate to `evaluated`; a failed status update is retained as
  an explicit warning because the completed evaluation remains valid.

## Operational limits

- This is a batch evaluator: callers supply the full ordered window. It has no worker, scheduler,
  event storage, checkpoint, or restart recovery.
- A completed candidate/window is returned as an explicit duplicate. An in-progress result created
  before a transient finalization failure can be retried with the same complete window.
- Provider payloads, trading execution, aggregation, alerts, and multi-window evaluation remain
  outside this package.
