# Before/After Revision Evidence

## Purpose
Describe how baseline and target revision evidence is presented for first-version setup-revision comparison.

## Baseline vs target semantics
- baseline = prior revision (`baselineRevisionId`)
- target = newer/candidate revision (`targetRevisionId`)
- both must belong to one `setupFamilyId`

The model avoids ambiguous "left/right" semantics.

## Evidence sources per revision
For each revision, comparison uses revision-scoped history:
- signal candidates linked by `setupRevisionId`
- evaluation results linked through those candidates
- aggregate records linked to revision setup-definition lineage

Historical records are never rebound to a newer revision.

## Scope alignment
Before/after comparison applies the same scope to baseline and target:
- same evaluation window filter (if provided)
- same symbol filter set (if provided)
- same time range (if provided)

This ensures deltas are like-for-like in first version.

## Output interpretation model
Comparison output is descriptive:
- baseline metrics
- target metrics
- explicit deltas
- evidence counts
- optional warnings

It does not produce ranking or optimization decisions.

## Insufficient evidence handling
When one side lacks enough completed evidence:
- status is `insufficient_evidence`
- baseline/target context still returned
- reason/warnings remain explicit

This keeps review outcomes traceable without hidden inference.
