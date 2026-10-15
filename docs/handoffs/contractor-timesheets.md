# Contractor timesheets — design update

## Ticket

| | |
|---|---|
| ID | No Linear ticket yet. This is a design handoff for the contractor hour-logging UI that already exists in the product. |
| Title | Contractor profile timesheets: match the updated prototype |
| Linear | Not filed. Existing related surface: team profile timesheets at `/team/<jobApplicationId>/profile/timesheets`. |
| Prototype | https://patricemmh.github.io/be-platform/contractor-profile.html |
| Source | https://github.com/patricemmh/be-platform/blob/main/contractor-profile.html |
| Written against commit | `1806401` |

## How to use this

Paste this file into Claude Code in the **application** repo, not this prototype repo.

This document is the only spec for this task. The work is the contractor profile Timesheets tab, plus the basic Profile tab on `contractor-profile.html`.

Do not read, fetch, or follow any of these. They are a different feature:

- `docs/interview-ui-handoff-prompt.md`
- `interview.html`
- The dev-tools panel labeled **Handoff — Live AI Interview UI**

If an older timesheet spec, ticket, or existing screen disagrees with this file or with `contractor-profile.html`, follow this file and that prototype. Do not stop to ask which one wins.

The product already logs contractor hours. Do not rebuild that system. Restyle and restructure the existing contractor timesheet so it matches this prototype. Reuse current components, data, and APIs. The HTML here is a visual and behavior reference only.

Open the prototype side by side while implementing:

| Environment | URL |
|-------------|-----|
| GitHub Pages | https://patricemmh.github.io/be-platform/contractor-profile.html |
| Local (`npm run dev`, port 37689) | http://localhost:37689/contractor-profile.html |

The page opens on **Timesheets**. `#profile` is the basic contractor profile. From other prototype pages, Account menu → **View as contractor**.

## Summary

An active contractor opens their profile and lands on a Timesheets tab. They log hours against current assignments only. Week view is a grid: one row per project and task, one column per day. They add a row from a modal, then type hours in the grid. Day view is for a single day, including notes and more than one entry on the same project and task. There is no submit, approval, or lock in this design.

## Touchpoints

| Page | Location | Neighboring components (reference only, don't rebuild) |
|------|----------|--------------------------------------------------------|
| `contractor-profile.html` | `#panel-timesheets` inside the existing profile shell | Top bar, icon rail, profile subhead, Profile tab |
| `contractor-profile.html` | `#panel-profile` | Assignments card and “This week” summary. Keep if the contractor profile is in scope; do not restyle the recruiter candidate profile. |
| `profile.html`, `client.html`, `client-profile.html`, `messages.html`, `vetting.html`, `feedback.html` | Account menu group “View as contractor” | Prototype navigation only. Do not add this menu to production. |

## What already exists vs what to change

Keep the real data model, permissions, Harvest linkage, and persistence. Change the contractor-facing screen to match the prototype.

**Remove from this screen**

- Submit week, submit a day, submit a date range
- Status pills and banners (Not submitted, Partly submitted, Pending, Approved, Locked)
- Any lock that blocks edit or delete because a week was submitted
- Inline project and task dropdowns inside the week grid

**Keep or add**

- Week and day views
- Assigned projects and their tasks only
- Create, edit, and delete time entries
- Optional note
- Daily and weekly totals
- Add a project/task row before typing hours on the week grid

## What to build

### Shell

Same profile chrome as the candidate profile: sticky top bar, icon rail, subhead with photo, name, and tabs **Profile** and **Timesheets**. Timesheets is the default tab. Tab text is 15px, active color `#4c60b2`, 3px underline.

### Profile tab (basic)

Hero with photo and name, location, phone, email. Meta: Active contractor, timezone, contractor since, assignment count. Assignments list current clients only, each with **Log time**. Side card **This week** shows hours and a 7-bar chart, plus **Open timesheets**. Timezone card under that. No recruiting fields.

**Log time** opens Timesheets on Day view for today, with that assignment’s row preselected when it already exists on the week.

### Timesheets toolbar

One white card, max width 1180px, radius 8px, page background `#fafafa`.

Toolbar padding `18px 20px`, space-between:

- Left: previous week (36px outlined icon button), week title (18px / 500 / `#2a2a2a`), hours under it (13px / `#888`), next week button. When the visible week is not the current week, a **This week** text button sits under the title.
- Right: a segmented **Day | Week** control only. Week is the default. No status, no submit.

### Week grid

Table, Monday through Sunday, plus a Total column.

- First column header: **Project / task**
- Day headers: uppercase weekday, date number. Today is blue with a “Today” tag and a light blue column wash (`#f8f9fd`). Weekend columns are `#fcfcfc`.
- Each body row is fixed text, not dropdowns: client (12px `#888`), project (15px / 500), task (13px `#707070`).
- Hour inputs are right-aligned, 14px, tabular numbers, white fill, 1px border `#e4e4e4`, radius 4px, height 36px. Hover border `#cfcfcf`. Focus border `#4c60b2` with a `#c5cee9` ring.
- A note icon sits to the right of an input that has an entry. Blue when a note exists, gray otherwise.
- Footer row label **TOTAL**. One total per day, right-aligned in that day’s column, and a week total in the last column. Numbers line up with the hour inputs (extra right padding so they clear the note icon).
- **Add row** is an outlined button under the table only, with about 20px of space above it. There is no second Add row button in the toolbar, and no helper sentence under the button.
- An empty pinned row (no hours) shows a remove control.

### Add row modal

Title bar: **Add row to this timesheet** (centered, `#f3f3f3` bar).

Body label: **Project / Task**.

- First select: current assignments, grouped by client, showing the project name.
- Second select: tasks for that project. If the project has one task, select it automatically.
- **Save row** is green (`#319243`), white label. **Cancel** is outlined, to the right of Save.
- Saving adds an empty row on the current week. Duplicate project + task on the same week is rejected.
- Project and task cannot be changed from the grid after the row exists.

### Day view

Left strip of the seven days (hours on each; “Today” on today) and a week total. On narrow widths the strip becomes a horizontal scroller.

Main column: date heading, that day’s entries (client, project · task, note, hours, edit, delete), then an add form.

The add form only offers rows already on this week (project / task as one select), plus hours and an optional note. If the week has no rows, the empty state tells the contractor to add a row in Week view first.

### Edit entry

Modal title **Edit entry**. Project, client, and task are read-only summary text. Editable fields: hours, date, note. **Delete**, **Cancel**, **Save**. Moving the date follows that entry to the destination week.

## States

- **Empty week:** no rows, footer totals `0.00`, **Add row** still available.
- **Empty day:** “No time logged for {weekday} yet.” If the week has rows, the add form is still there.
- **Loading:** use the app’s existing loading pattern. The prototype has none.
- **Error:** invalid hours toast or inline form error. Copy in the prototype: “Enter hours as a number, like 8 or 7.5.”, “Hours cannot be negative.”, “One entry cannot be more than 24 hours.”, “That project and task already has a row this week.”, “This day has more than one entry. Edit them in Day view.”
- **Hover / focus:** hour cells and icon buttons as in Visual specs. Segmented control: selected segment background `#f4f6fb`, text `#4c60b2`.
- **Disabled:** task select in the add-row modal stays disabled until a project is chosen. A week cell with more than one entry for that project and task is read-only and opens Day view on click.
- **Over 24 hours in a day:** the day total turns `#d7373f`. Do not block the save.
- **Responsive:** under 800px the day strip stacks above the day detail and the add form becomes two columns. Under 720px the icon rail hides. The week grid scrolls horizontally (`min-width: 920px`).

## Behavior and interactions

- Monday is the first day of the week. Dates are local, not UTC.
- **Next week** copies the current week’s project/task rows into the next week. Hours do not copy. **Previous week** and **This week** do not carry empty rows forward.
- Typing hours and pressing Enter commits the cell and focuses the next day on that row.
- Clearing a cell deletes that single entry. Typing `0` saves `0.00` and keeps the entry.
- Allowed hours per entry: `0` through `24`, up to two decimals. A comma is accepted as a decimal point.
- One project + task is one row. Two entries on the same project, task, and date sum in the week cell and must be edited in Day view.
- Notes are edited from the note icon (single entry) or from the day-view edit modal.
- Only current assignments appear in the add-row modal.
- A task is required to save a row.
- Billable vs non-billable is not on this screen.
- Nothing on this screen submits a timesheet or locks a day.
- Refreshing the prototype resets sample data. Production must persist.

### Sample data in the prototype (placeholders)

Gabriel Kouyoumdjian, Montevideo, GMT-3. Assignments: Vistera / Platform rebuild (Frontend, API, Code review), Optimus MD / Patient portal (Frontend, Bug fixes), DAC Consulting / Architecture advisory (Consulting). The current week is prefilled so the grid is not empty. Treat names, hours, and notes as mock content.

## Visual specs

From `contractor-profile.html` `:root`. Match these; do not import the prototype stylesheet.

| Token | Value | Use |
|---|---|---|
| `--page` | `#fafafa` | Page background |
| `--blue` | `#4c60b2` | Tabs, links, primary buttons, focus, today |
| `--green` | `#319243` | Save row, active-contractor dot |
| `--danger` | `#d7373f` | Over-24 totals, destructive hover |
| `--line` | `#ececec` | Card and toolbar dividers |
| `--shadow` | `0 1px 2px rgba(0,0,0,.14), 0 2px 6px rgba(0,0,0,.07), 0 0 0.5px rgba(0,0,0,.14)` | Cards |
| `--font` | `"runda", system-ui, sans-serif` | Typekit `lhs7vwi` |
| `--ease` | `cubic-bezier(.4, 0, .2, 1)` | Toasts |

`b, strong` are weight 500, not 700. Hour inputs and totals use tabular numbers.

## Implementation guidance (Claude Code)

This is a visual and behavior reference. Do not port the HTML. Inspect the existing timesheet components first and reuse them. Only add pieces that do not exist, mainly the add-row modal and the read-only project/task row label.

Match spacing, typography, colors, and the interactions in this document. Keep the application’s data layer, routing, and component conventions.

If production still has submit or approval on this contractor screen, hide it. Approval stays out of this UI.

Stay on this feature. Do not open the interview prototype or the interview handoff while doing this work.

## Acceptance checklist (QA)

- [ ] An active contractor opens their profile on Timesheets, with Profile as the other tab.
- [ ] Week view is the default. Day and Week switch without leaving the page.
- [ ] The toolbar is the week navigator plus the Day/Week control. No submit button, status pill, or lock banner.
- [ ] The contractor can only add rows for current assignments, and must pick a task.
- [ ] Project and task on a week row are text. They cannot be changed from the grid.
- [ ] **Add row** appears once, under the grid, and opens the modal. Save row is green.
- [ ] Hours can be typed per day, including `0`. Enter moves to the next day. Clearing a cell deletes that entry.
- [ ] A note can be added and edited. Two entries on the same project, task, and day are edited in Day view, not in the summed cell.
- [ ] An entry can be edited (hours, date, note) and deleted. Project and task stay fixed in the edit modal.
- [ ] Daily totals sit in the correct day columns and line up with the numbers above. The week total is in the last column.
- [ ] Next week brings over the previous week’s rows without copying hours.
- [ ] A day total over 24 is shown in red and is still allowed. A single entry cannot exceed 24.
- [ ] Desktop and a ~390px width both remain usable: day strip scrolls, week grid scrolls sideways.

## Out of scope

- Copy-last-week as a separate action beyond the next-week row carry
- Reminders, approval notifications, personal reports, a running timer, natural-language entry
- Time off, expenses, billable amounts, rates, invoicing
- Calendar sync, bulk delete, onboarding, dark mode
- Changing who approves time, or building an approval inbox
- The prototype account menu “View as contractor”

## References

- Prototype: https://patricemmh.github.io/be-platform/contractor-profile.html
- File: `contractor-profile.html`
- Handoff: `docs/handoffs/contractor-timesheets.md`
