# Closed-Candle Pattern Detection

## Purpose

`@monitor/pattern-detection` evaluates normalized `CandleClosedEvent` inputs without depending on
an exchange adapter. Its first rule detects a 5m candle whose close is strictly above the highest
high of the preceding 20 closed candles for the same source and canonical symbol.

## Runtime boundary

- Detector configuration binds a setup definition and canonical monitored symbol to the fixed
  `bullish_close_breakout_v1` rule.
- The runtime keeps bounded, process-local candle history per `sourceId`, symbol, and timeframe.
- On a match, it resolves the active setup revision and passes a deterministic
  `DetectionToCandidateCommand` to the existing signal-candidate handoff.
- Candidate evidence retains the normalized event ID, source, symbol, close, breakout threshold,
  timeframe, and lookback. Provider payloads never enter this package.

## Operational limits

- Callers provide chronological closed candles and await `process` sequentially.
- The runtime does not store checkpoints, events, or retry state. A restart requires historical
  candles to rebuild its lookback before live processing resumes.
- Duplicate candidate protection remains owned by the product-domain handoff and repository.
- Ingestion transport, workers, scheduling, evaluation, alerts, and trading execution are outside
  this package.
