# Developer handoffs

How feature handoff prompts are produced for developers once a Linear ticket is **Ready for Dev**. Each handoff is a Markdown prompt that a developer pastes into **Claude Code** to implement the feature in their own codebase, using the static prototype on GitHub Pages as the reference.

> Status: **plan agreed, tooling not built yet.** The folder, template, and conventions below are the source of truth. Tooling gets built on first real use, after confirming with the designer.

---

## Context and constraints

**Flow:** ideation → designs → PM requests changes → rounds of revisions → **Ready for Dev** → assigned to a developer → developer reads the ticket, which contains a link to the GitHub Pages prototype.

- **The PM owns all Linear tickets and user stories.** Never edit them: no changes to descriptions, user stories, acceptance criteria, comments, labels, or statuses. **Linear is read-only** for this workflow: read the ticket and its acceptance criteria only.
- The only thing that goes in the ticket is the **prototype link** the designer already posts (optionally screenshots, also posted by the designer).
- **Developers use Claude Code; the designer uses Cursor.**
- The dev codebase is a **different stack with its own components**. Prototypes here are plain HTML/CSS. They are a **visual and behavior reference only, not code to port**.
- **Reviewers:** the PM and a QA person (plus QA automation). **QA is the main reviewer**, so the acceptance checklist must be testable.
- **The agent writes the prompt.** The designer does not want to write it. Designs are considered final at Ready for Dev.

---

## Trigger

The designer says something like:

- "generate the handoff for BE-812"
- "launch a new feature handoff"
- "BE-812 is ready for dev"

---

## Agent steps

1. **Read the Linear ticket (read-only)** via the Linear MCP: description, user story, acceptance criteria, linked prototype URLs, sub-issues.
2. **Identify every prototype page/area the ticket touches**, using:
   - links in the ticket,
   - `data-feature="BE-xxx"` markers in the HTML, if present,
   - commits mentioning the ticket: `git log --grep BE-xxx --oneline`.
3. **Read those pages** and write `docs/handoffs/BE-xxx.md` using the template below. Scope it **only to the feature**, not the whole page, unless the ticket is a full new page.
4. **Pin the version:** record the commit hash the handoff was written against (`git rev-parse --short HEAD`).
5. **Update the manifest:** add or update the entry in `docs/handoffs/index.json` (ticket → pages → selectors to highlight).
6. **Designer reviews, then pushes.** Do not commit or push unless asked. Never commit `.env`.
7. **Link for the ticket:** `https://patricemmh.github.io/be-platform/<page>.html?handoff=BE-xxx`

### `index.json` shape (proposed)

```json
{
  "BE-812": {
    "title": "Short feature title",
    "doc": "docs/handoffs/BE-812.md",
    "commit": "abc1234",
    "pages": [
      { "page": "vetting.html", "selectors": ["[data-feature=\"BE-812\"]"] },
      { "page": "interview.html", "selectors": [".summary-panel"] }
    ]
  }
}
```

---

## Scaling by size

Same template every time; the length changes with scope.

| Size | Touchpoints | Typical length |
|------|-------------|----------------|
| Single card / component | One | Short: a page or two |
| Cross-page change | Several, plus how data flows between them | Medium |
| Full new page | The whole page | Large, like `docs/interview-ui-handoff-prompt.md` |

For small handoffs, collapse sections that don't apply to one line (e.g. "States: hover only, see Visual specs") rather than deleting them, so QA can see that they were considered.

---

## Template

Copy into `docs/handoffs/BE-xxx.md` and fill in.

````markdown
# BE-xxx — <Feature title>

## Ticket

| | |
|---|---|
| ID | BE-xxx |
| Title | <ticket title> |
| Linear | <Linear issue URL> |
| Prototype | https://patricemmh.github.io/be-platform/<page>.html?handoff=BE-xxx |
| Written against commit | `<short hash>` |

## Summary

<2–4 sentences: what the feature is, who uses it, and why. Paraphrase the user story; don't change it.>

## Touchpoints

| Page | Location | Neighboring components (reference only, don't rebuild) |
|------|----------|--------------------------------------------------------|
| `<page>.html` | <where on the page, selector if useful> | <what sits around it> |

<For cross-page changes: describe how data flows between touchpoints.>

## What to build

- **Structure:** <layout, hierarchy of elements>
- **Contents:** <labels, copy, icons, fields>
- **Mock data:** <sample values used in the prototype; note which are real-data placeholders>

## States

- **Empty:**
- **Loading:**
- **Error:**
- **Hover / focus / active:**
- **Disabled:**
- **Responsive:** <breakpoints and what changes>

## Behavior and interactions

<Clicks, transitions, validation, keyboard, what persists, what navigates where.>

## Visual specs

<Tokens, spacing, type, and colors taken from the prototype's CSS variables. Name the variable and its value, e.g. `--ink: #1a1a1a`. Note when later CSS overrides earlier rules.>

## Implementation guidance (Claude Code)

This is a visual and behavior reference. Do not port the HTML. Inspect your existing components first and reuse them; only create new ones when nothing fits. Match spacing, typography, colors, and state transitions to the prototype; keep your codebase's conventions for structure, data, and styling.

## Acceptance checklist (QA)

Mirrors the ticket's acceptance criteria. Each item should be checkable against the prototype.

- [ ] <criterion from ticket>
- [ ] <criterion from ticket>
- [ ] States above all match the prototype
- [ ] Responsive behavior matches at <breakpoints>

## Out of scope

- <things on the page that are not part of this ticket>

## References

- Prototype (deep link): https://patricemmh.github.io/be-platform/<page>.html?handoff=BE-xxx
- Prototype history: `git log --grep BE-xxx --oneline`
- Screenshots: <attached by designer in the ticket, if any>
````

---

## Conventions

- Wrap new features in the prototype HTML with `data-feature="BE-xxx"` so the agent (and later dev-tools) can find and highlight them.
- Put the ticket ID in commit messages (e.g. `BE-812: add summary card`) so `git log --grep` finds the history.

---

## Planned tooling (not built yet)

Build on first real use and confirm the approach with the designer first.

- [ ] `docs/handoffs/` folder, this template, and the `index.json` manifest (README exists; manifest not yet).
- [ ] `?handoff=BE-xxx` support in dev-tools (`dev-tools/dev-tools.js` + `dev-tools/dev-tools.css`): auto-open the inspect panel, show that ticket's handoff with a **Copy prompt** button, and highlight the feature area on the page. For multi-page handoffs, show it on each touched page.
- [ ] Convention: `data-feature="BE-xxx"` wrappers and ticket IDs in commit messages (see above).
- [ ] Optional: indicator in the Linear dashboard (`dashboard.html` + `server/`) for Ready for Dev tickets that don't have a handoff yet. Read-only; it must not write to Linear.
- [ ] Pilot on 1–2 real tickets, collect developer and QA feedback, refine the template.

---

## Existing example to migrate

The **Live AI Interview UI** is the first handoff and predates this structure:

- Spec: `docs/interview-ui-handoff-prompt.md` (a full-page handoff)
- The hard-coded "Handoff — Live AI Interview UI" section in `dev-tools/dev-tools.js` (`HANDOFF`, `handoffSection()`)

Both should eventually be migrated into this structure: the spec moved or linked as a `docs/handoffs/<ticket>.md` entry with an `index.json` record, and the dev-tools section driven by `?handoff=` instead of being hard-coded.
