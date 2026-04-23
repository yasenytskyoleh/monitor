# Review Packet Contents

## First minimum contents
First-version review packets are expected to provide:
- setup family identity
- setup revision context (if resolvable)
- revision lineage/status metadata
- latest impact summary snapshot (if supplied)
- latest hypothesis evidence snapshot (if resolvable)
- latest feedback decision snapshot (if resolvable)
- latest approval snapshot (if resolvable)
- explicit warnings for missing/outdated context

## Completeness rules
`complete`:
- revision context resolved
- enough linked evidence context for review
- no warnings

`partial`:
- revision context resolved
- some linked evidence context resolved
- warnings present for missing artifacts/caveats

`insufficient_context`:
- revision context missing, or
- revision context present but evidence/review context is still too sparse for meaningful review

`failed`:
- unexpected packet assembly failure

`rejected` (result envelope only):
- invalid command selectors or invalid linkage constraints

## Warning examples
- no setup revision context resolved
- latest impact summary snapshot is missing
- linked research hypothesis context is missing
- latest research feedback decision snapshot is missing
- latest research decision approval snapshot is missing
- impact summary does not include resolved revision context

## Explicitly out of scope
- dashboard rendering
- packet inbox workflow
- autonomous recommendation logic
- automatic approvals or setup mutations
