# Detection to Candidate Flow

## Happy path (first version)
1. monitoring pipeline emits normalized event
2. deterministic setup rule evaluates event context
3. runtime resolves current active setup revision for the setup selector
4. setup detection hit is produced with explicit revision context
5. detection hit is mapped to `DetectionToCandidateCommand` including `setupRevisionId`
6. runtime handoff coordinator invokes product service
7. `SignalCandidate` is persisted in `detected` status with `setupRevisionId`
8. handoff result returns created candidate id

## Ownership boundaries
- detection/runtime side:
  - event normalization
  - deterministic rule evaluation
  - active revision resolution
  - hit payload construction
- product side:
  - command validation
  - setup/symbol reference checks
  - duplicate detection-hit rejection policy
  - signal candidate persistence

## Failure boundaries
- invalid hit command -> reject before persistence
- missing setup/symbol references -> reject via product validation
- missing or mismatched setup revision reference -> reject
- duplicate detection hit -> explicit duplicate outcome
- unexpected persistence failure -> explicit failed outcome with retry hint

## Orchestrator separation
- runner/orchestrator artifacts remain runtime evidence only
- product candidate records remain product-domain persistence records
- handoff may include origin metadata but does not store product records in runtime artifact folders

## Postponed work
- live event ingestion runtime implementation
- background retries/queues
- scheduled detection jobs
- full event bus and worker topology
