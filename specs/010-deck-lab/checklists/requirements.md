# Requirements quality checklist: Deck Lab

**Owner:** Human reviewer
**Purpose:** Review the completeness and clarity of the requirements in [spec.md](../spec.md). `[x]` means reviewer approval of requirement quality, not implementation completion. This checklist is intentionally unchecked.

## Journeys and scope

- [ ] CHK001 Are Rate and Pimp inputs, outputs and navigation entry points specified separately and objectively?
- [ ] CHK002 Is the 45-card boundary clear about maindeck, sideboard and basic lands?
- [ ] CHK003 Is the restriction to submitted nonbasic cards and freely allocated basics explicit?
- [ ] CHK004 Are behavior and wording defined when the submitted 40-card deck is retained?

## Data and explanations

- [ ] CHK005 Are exact catalog resolution, unknown-name rejection and cube coverage limits unambiguous?
- [ ] CHK006 Are the five Axes de deck, formula version and heuristic meaning required in the result?
- [ ] CHK007 Are photo correction and the absence of persistence clear to the player?
- [ ] CHK008 Does the spec distinguish MTGA text export from verified Arena availability?

## Quality and boundaries

- [ ] CHK009 Are the 39/40 and 45/46 count scenarios measurable?
- [ ] CHK010 Are desktop keyboard access and 360–375 px mobile behavior stated measurably?
- [ ] CHK011 Are reduced cube context, sparse pools and cards outside a snapshot addressed?

## Notes

The reviewer owns the checkbox lifecycle. The implementation agent does not self-approve these items.
