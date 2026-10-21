# Contractor hours

## Ticket

| | |
|---|---|
| ID | No Linear ticket yet. This is a design handoff for the contractor hour-logging screen that already exists in the product. |
| Title | Contractor hours: match the updated prototype |
| Linear | Not filed. The product route is `/my/hours` in the candidate portal. |
| Prototype | https://patricemmh.github.io/be-platform/my/hours.html |
| Source | https://github.com/patricemmh/be-platform/blob/main/my/hours.html |
| Written against commit | Update this hash when the prototype is pushed. |

## How to use this

Paste this file into Claude Code in the **application** repo, not this prototype repo.

This document is the only spec for this task. The work is the contractor's own Hours page.

Do not read, fetch, or follow any of these. They are a different feature:

- `docs/interview-ui-handoff-prompt.md`
- `interview.html`
- `contractor-profile.html` (an older staff-profile sketch; the hours grid no longer lives there)
- The dev-tools panel labeled **Handoff — Live AI Interview UI**

If an older timesheet spec, ticket, or existing screen disagrees with this file or with `my/hours.html`, follow this file and that prototype. Do not stop to ask which one wins.

The product already logs contractor hours. Do not rebuild that system. Restyle and restructure the existing contractor hours screen so it matches this prototype. Reuse current components, data, and APIs. The HTML here is a visual and behavior reference only.

Open the prototype side by side while implementing:

| Environment | URL |
|-------------|-----|
| GitHub Pages | https://patricemmh.github.io/be-platform/my/hours.html |
| Local (`npm run dev`, port 37689) | http://localhost:37689/my/hours |

## Summary

An active contractor logs hours on their own Hours page in the candidate portal. The page uses the portal chrome and a page title of **Hours**. Week view is the only view: one row per project and task, one column per day. They add a row from a modal, then type hours in the grid. A save is not shown as kept until Harvest confirms it. Billed and locked entries stay visible and cannot be changed.

## Touchpoints

| Page | Location | Neighboring components (reference only, don't rebuild) |
|------|----------|--------------------------------------------------------|
| Product route `/my/hours` | The hours grid under the portal page title | Candidate portal header, sidebar, and page-title band. The prototype sidebar is a stand-in so the page sits in portal chrome. Do not rebuild navigation from it. |
| Prototype `my/hours.html` | `#hours` | Same screen. The account menu links back to other prototype views. Do not add that menu to production. |

## What already exists vs what to change

Keep the real data model, permissions, Harvest linkage, and persistence. Change the contractor-facing screen to match the prototype.

**Remove from this screen**

- The staff profile wrapper, contractor photo subhead, and Profile / Timesheets tabs
- The Day / Week toggle. Week view only. A day view is a later change, so hide it rather than design around it.
- Submit week, submit a day, submit a date range
- Status pills and banners for submission or approval
- Inline project and task dropdowns inside the week grid
- Saving a zero-hour entry

**Keep or add**

- Week grid only, on `/my/hours`
- Assigned projects and their tasks only
- Create, edit, and delete time entries, with billed and locked cells left closed
- Optional note
- Daily and weekly totals
- Add a project/task row before typing hours
- A remove control on a row that has no hours

## What to build

### Shell

Use the candidate portal chrome that already wraps portal pages. Do not invent a new shell and do not use the staff recruiter layout.

The page title band reads **Hours**. On desktop the title is the page-title style (25px, weight 100, color `#333333`) with 30px below the band. Below 767px the title is 18px / 21px at weight 400, the band's bottom margin is replaced by a 1px faint rule, and the band padding is 13px.

Page background is `#F6F6F6`. Body text is `#333333`. Secondary text is `#707070`. Buttons follow the app button recipe: 45px tall, 16px, weight 500, 4px radius. Primary fill is `#4C60B2`. The green **Save row** button stays `#319243`.

### Week toolbar

Inside the white card:

- Previous week, the week range, next week.
- The week's total hours sit under that range.
- When the visible week is not the current week, **This week** sits under the range and jumps back.
- Future weeks are open. There is no Day control, no copy-last-week button, no submit control, and no status.

**Next week** carries the current week's project/task rows forward as empty rows. Hours do not copy. **Previous week** and **This week** do not carry empty rows.

### Week grid

Monday through Sunday, plus a Total column. Every row is labeled client, then project, then task, ordered by client. There are no client heading rows.

- Hour fields accept a number greater than 0, at most 24, with at most two decimal places. A comma is a decimal point.
- `0`, a negative number, more than 24, and more than two decimal places are each refused. The message names that rule. The cell returns to the last saved value.
- Clearing a cell removes that entry. It does not ask for confirmation.
- Enter saves the cell and moves focus to the next day's cell on that row.
- A cell is disabled while its save is in flight, and it shows **Saving**. Nothing on the grid updates to the new value until Harvest confirms the save. If Harvest refuses or the save fails, the cell returns to the last saved value and a toast names the reason.
- A billed or locked entry shows its hours, a lock, and the reason (**Billed** or **Locked**). It cannot be edited or deleted.
- A day that already has several Harvest entries for that project and task is read-only and says **Managed in Harvest**.
- A row with no hours has a **Remove** control. A row with hours does not.
- Footer totals stay in the day columns, with the week total in the last column. Today has a **Today** tag and a light blue wash. Weekend columns are tinted. A day total over 24 is red and is still allowed.
- **Add row** is the outlined button under the grid. It is the only add control.

The prototype treats an entry of exactly 13 hours as a failed Harvest save so that state can be reviewed. Do not ship that special case.

### Add row

**Add row to this timesheet.** Project is grouped under its client, then task. **Save row** and **Cancel**. A project and task already on the week are not offered. One task on a project is selected automatically. The new row is empty. Project and task cannot be changed from the grid after that.

### Edit entry

Opened from the note control on a single editable entry. Project, client, and task are read-only. Editable fields are hours, date, and note. **Delete**, **Cancel**, **Save**.

Delete asks for confirmation. Clearing a grid cell does not.

Changing the date moves the entry, and the week view follows it to that week. The same hour rules and the same in-flight save apply. A billed or locked entry never opens this modal.

## States

- **Empty week:** no rows, footer totals `0.00`, **Add row** still available.
- **Empty row:** client, project, and task, blank day cells, and **Remove**.
- **Saving:** the cell is disabled and reads **Saving** until Harvest confirms.
- **Refused hours:** toast **Hours must be greater than 0.**, **Hours cannot be more than 24.**, or **Hours can have at most two decimal places.** The previous value returns.
- **Failed save:** toast **Harvest could not save this entry.** The previous value returns.
- **Billed / locked:** hours, lock icon, and the reason. No editor and no delete.
- **Several Harvest entries:** read-only total and the line **Managed in Harvest**.
- **Over 24 hours in a day:** the day total turns `#d7373f`. The save is not blocked.

## Behavior and interactions

- Monday is the first day of the week. Dates are local, not UTC.
- Only current assignments appear in the add-row modal. A task is required.
- Billable amounts, rates, and approval are not on this screen.
- Refreshing the prototype resets sample data. Production must persist.

### Sample data in the prototype (placeholders)

Gabriel Kouyoumdjian. Assignments: Vistera / Platform rebuild (Frontend, API, Code review), Optimus MD / Patient portal (Frontend, Bug fixes), DAC Consulting / Architecture advisory (Consulting).

The current week shows an editable Frontend row, a Tuesday Frontend cell with two Harvest entries, a locked Optimus Bug fixes cell, a billed Vistera API cell, and an empty DAC Consulting row with **Remove**. Treat names, hours, and notes as mock content.

## Implementation guidance (Claude Code)

This is a visual and behavior reference. Do not port the HTML. Inspect the existing hours screen first and reuse it.

Put the grid on `/my/hours`, under the portal chrome and the **Hours** title. Hide the day view. Do not accept zero hours. Show billed and locked cells, and do not paint a new value until the save succeeds.

Stay on this feature. Do not open the interview prototype, the interview handoff, or the old contractor profile sketch while doing this work.

## Acceptance checklist (QA)

- [ ] `/my/hours` opens in the candidate portal with the title **Hours**. The staff profile and the Timesheets tab are not this screen.
- [ ] Week view is the only view. There is no Day control.
- [ ] The toolbar is the week navigator, the total under the week label, and **This week** when needed. No submit control.
- [ ] Next week carries the current rows forward without hours. Future weeks open.
- [ ] Add row offers only assignment pairs that are not already on the week, grouped by client, and requires a task.
- [ ] Project and task on a row are text. They cannot be changed from the grid.
- [ ] A row with no hours can be removed. A row with hours cannot.
- [ ] Hours must be greater than 0, at most 24, and at most two decimal places. Each refusal names the rule and restores the last saved value.
- [ ] Clearing a cell deletes that entry without a confirmation. Delete from the edit modal asks first.
- [ ] Enter saves and moves to the next day. The cell shows **Saving** and does not show the new value until the save succeeds. A failed save restores the old value and names the reason.
- [ ] A billed or locked cell shows the hours, a lock, and the reason, and cannot be edited or deleted.
- [ ] Two Harvest entries in one cell are read-only and say they are managed in Harvest.
- [ ] Changing the date in the edit modal follows that entry into the other week.
- [ ] Daily totals sit in the correct columns. Today and weekend columns are marked. A day over 24 is red and still allowed.

## Out of scope

- A day view
- Copy-last-week as a separate action beyond the next-week row carry
- Reminders, approval notifications, personal reports, a running timer, natural-language entry
- Time off, expenses, billable amounts, rates, invoicing
- Calendar sync, bulk delete, onboarding, dark mode
- Changing who approves time, or building an approval inbox
- The prototype account menu and the stand-in portal links

## References

- Prototype: https://patricemmh.github.io/be-platform/my/hours.html
- File: `my/hours.html`
- Handoff: `docs/handoffs/contractor-timesheets.md`
