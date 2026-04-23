# Revision Impact Classification

## Purpose
Document first-version deterministic rules for classifying revision impact from explicit comparison deltas.

## Classifications
- `improved`
- `degraded`
- `mixed`
- `inconclusive`

These labels are descriptive only.
They do not imply automatic activation, ranking, or optimization actions.

## Key metric deltas used
- completed evaluations
- positive outcome rate
- average percentage move
- average final outcome
- average max favorable excursion
- average max adverse excursion

Each delta is interpreted with explicit sign semantics:
- positive delta -> positive direction
- negative delta -> negative direction
- null/near-zero delta -> neutral/unknown

## First evidence sufficiency labels
- `sufficient`
- `limited`
- `insufficient`

First thresholds:
- `insufficient`: comparison status already insufficient, or either side has <3 completed evaluations
- `limited`: minimum completed evaluations between 3 and 9
- `sufficient`: minimum completed evaluations >=10

## First classification rules
1. If evidence sufficiency is `insufficient`, classify as `inconclusive`.
2. If fewer than 3 key metrics have comparable non-neutral deltas, classify as `inconclusive`.
3. If positive-direction metrics outnumber negative-direction metrics, classify as `improved`.
4. If negative-direction metrics outnumber positive-direction metrics, classify as `degraded`.
5. If both positive and negative directions exist without a majority, classify as `mixed`.
6. Otherwise, classify as `inconclusive`.

## Warnings and caveats
Summary warnings must remain explicit for:
- limited/insufficient evidence
- aggregate evidence gaps carried from comparison notes
- low number of comparable deltas

No hidden fallback or heuristic ranking is introduced in this slice.
