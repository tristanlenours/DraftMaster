# Issue Tracker: GitHub

Issues for this repository live at `tristanlenours/DraftMaster`. Run `gh` commands from the repository so the configured `origin` selects the project automatically.

## Routine Operations

- Create: `gh issue create --title "..." --body-file <file>`
- Read with discussion: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,labels,assignees`
- Comment: `gh issue comment <number> --body "..."`
- Label or assign: `gh issue edit <number> --add-label "..." --add-assignee @me`
- Close with a resolution: `gh issue close <number> --comment "..."`

Use `$speckit-taskstoissues` only after `spec.md`, `plan.md`, and `tasks.md` pass their quality gates. Pull requests are not an incoming request or triage surface.

## Wayfinding

A decision map is one issue labelled `wayfinder:map`. Its decision tickets are sub-issues labelled `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`; create these labels when the first map needs them. Use GitHub's native sub-issue and dependency relationships when available. Claim a ticket by assigning it before work. Resolve it with an answer comment, close it, then add a one-line linked gist to the map's **Decisions so far** section.
