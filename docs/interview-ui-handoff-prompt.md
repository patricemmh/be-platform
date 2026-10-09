# Interview UI — Claude Code handoff spec

**Audience:** Implementer using **Claude Code** (terminal agent), not Cursor.  
**Source of truth:** Static prototype in this repo — `interview.html` (runtime room + in-room question set setup).  
**Visual reference (open side by side while building):**

| Environment | URL |
|-------------|-----|
| GitHub Pages | https://patricemmh.github.io/be-platform/interview.html |
| Local (`npm run dev`, port **37689**) | http://localhost:37689/interview.html |

Match **pixel behavior, spacing, typography, and state transitions** of the prototypes. The HTML files contain duplicate/overridden CSS blocks; **later rules win** (especially the flat “editorial” theme starting ~line 913 in `interview.html`). Do not ship the early “white card + gap” room layout unless you intentionally revert the prototype.

---

## 1. Product intent

BetterEngineer **live interview** screen for a fixed demo candidate (**Marcelo Dosko**). The interviewer:

1. Builds a question set in-room via **setup** (center column before/during call).
2. **Joins** a mocked video call.
3. Walks questions with **live transcript simulation** filling answers.
4. **Ends** the call → **summary / ratings / notes** → **Save and Close** → `vetting.html`.

Everything is **front-end mock**: no real WebRTC, no API, `localStorage` for persistence.

---

## 2. Global design system

### 2.1 Typography & font

- Load Adobe Typekit: `https://use.typekit.net/lhs7vwi.css`
- Family: `"runda", system-ui, -apple-system, sans-serif`
- Weights: `b, strong { font-weight: 500 }` (not 700)

### 2.2 CSS variables (`:root`)

Use these names consistently in any refactor (React, etc.):

| Variable | Typical value | Role |
|----------|---------------|------|
| `--page` | `#f6f6f3` | Page / panel background (warm off-white) |
| `--white` | `#f6f6f3` | Alias of page in interview |
| `--text` | `#1a1a1a` | Primary text |
| `--muted` | `#6b6b6b` | Secondary text |
| `--subtle` | `#9a9a96` | Labels, kickers |
| `--line` | `#c8c8c2` | Hairlines |
| `--line-strong` | `#b8b8b2` | Stronger dividers (older card UI) |
| `--brand` / `--blue` | `#4C60B2` | Primary actions, focus rings |
| `--blue-deep` | `#3a4b94` | Deep accent |
| `--brand-soft` / `--blue-soft` | `#eceef6` | Selected pills, pool chips |
| `--navy` | `#001062` | Rare accent |
| `--stage` | `#161925` | Pre-call lobby background |
| `--red` | `#c4473a` | End call, errors, mute-off |
| `--green` | `#4C60B2` | **Note:** in interview prototype, “green” progress/buttons map to brand blue |
| `--green-soft` | `#eceef6` | Hint pills |
| `--font` | runda stack | |
| `--ease` | `cubic-bezier(.4, 0, .2, 1)` | Transitions |
| `--profile` | `475px` default | Left column width |
| `--outline` | `322px` default | Right outline width |
| `--ai` | `0px` default; `380px` when AI open | Fifth column |

**Body modifiers (set on `<body>`):**

| Class | Effect |
|-------|--------|
| `is-pre-call` | Not in call, call not ended |
| `is-waiting-participant` | In call, candidate not joined yet (class toggled in JS; extend CSS if needed) |
| `is-call-ended` | Post-call summary mode |
| `is-profile-wide` | `--profile: 650px` (widen control exists in CSS; optional in DOM) |
| `is-outline-collapsed` | `--outline: 56px`; rail shows ticks only |
| `is-ai-open` | `--ai: 380px`; AI column visible |
| `is-resizing` | Column drag; disable pointer events on media |

### 2.3 Layout shell

```
.app
├── header.topbar
└── main.room
    ├── section.col [profile]
    ├── .split#split
    ├── section.col [questions .q-panel]
    ├── section.col.outline-col
    └── section.col.ai-col
```

- **Desktop:** `body { overflow: hidden }`, `.app { height: 100vh }`.
- **Room grid:** `grid-template-columns: var(--profile) 10px minmax(0, 1fr) var(--outline) var(--ai)`.
- **Final theme:** `gap: 0`, `padding: 0`, `background: var(--page)` — columns are flush, not floating cards.

---

## 3. `interview.html` — regions in detail

### 3.1 Topbar

- Height **68px**, white, bottom border `--line`, logo **18px** height.
- **Center:** (prototype has no `who-now` in final DOM — live badge is top-right only.)
- **`.top-right`:**
  - **`#liveBadge.live`:** `In progress · #clock` (MM:SS, tabular nums). Hidden when `is-pre-call` or `is-call-ended`.
  - **`.dock`** (not fixed in final theme — sits in topbar):
    - `#btnJoinCall.join-call` — visible only `is-pre-call`
    - `#btnHang.hang` — `"End call"` / `"Rejoin call"` (+ `.is-rejoin` when ended)
    - `#btnCloseScreen.close-screen` — visible `is-call-ended`; `"Save and Close"`

**Pre-call:** hide live + hang; show Join.  
**Ended:** hide live; hang becomes rejoin; show Save and Close.

### 3.2 Profile column (left)

**Structure:**

- `.panel > .panel-scroll.profile`
- **`.profile-sticky`:** video stage only (sticks on scroll in card theme; `position: relative` at ≤980px).
- **`.profile-body`:** hero, tools, stats, sections.

**`.call-wrap` > `#stageInner.call`:** see §4 Call states.  
**`.call-dock`:** mic / cam / share — see §4.3.

**Hero:** 48px rounded-rect avatar, name, location.

**`.profile-tools` / `.pools`:** static chips for demo pools (`.pool` pills). No widen button in current HTML (CSS remains).

**`.stats`:** 4-column row with vertical dividers (final CSS):

| Label | Demo value |
|-------|------------|
| Desired Hr. Pay | $12 |
| Desired Mo. Pay | $122 |
| Notice Period | Available now |
| Open to | Full-time |

**Sections** (`#skills`, `#work`, `#education`, `#languages`):

- Uppercase **h4** section titles, hairline separators between sections.
- **Skills:** simple rows (no levels in final HTML).
- **Work / education:** `.job` blocks with `.job-head` (title, company, dates) + `.job-body` (prose, bullets, `.chip` tags).
- **Languages:** `.lang` row.

**Column resize:** `#split` drag handle; persist width in `be-profile-width` (min 260, max ~62% room or 720px).

### 3.3 Questions column (center)

**`.q-panel`:**

| Child | Role |
|-------|------|
| `.q-head` | Tabs (post-call) + `#aiToggle` FAB |
| `#qStage.q-stage` | Main content (setup, question, script list, summary) |
| `#nextPeek.next-peek` | Previous / Next / Finish |
| `#transcriptPanel.transcript` | Collapsible transcript |

**`.q-head` (active interview):** padding `40px 28px 0 72px`; only AI FAB visible.  
**Post-call (`is-call-ended`):** tabs visible, min-height 56px, bottom border.

**Tabs `#qTabs`** (hidden until call ended):

- Summary | Questions | Transcript
- `.q-tab.is-on` with 2px bottom underline
- `wrapTab` state: `summary` | `questions` | `transcript`

**AI FAB:** 32px circle, brand fill; `.is-open` → dark gray; opens right AI column.

### 3.4 Outline column (right)

- `#qOutline.outline` inside `.outline-col`
- Head: kicker `answered of total` + **edit** pencil (`#editSet` → in-room setup via `openSetup()`) + **fold** (`#outlineFold`)
- Groups: Cultural | `Talent pool · {label}` | `{company} · {role}`; items are **buttons** with `data-jump="{index}"`
- States: `.is-done` (answered), `.is-now` (current question)
- Collapsed: `is-outline-collapsed` — 56px rail, ticks only

**Post-call:** `outline-col { display: none }`, `--outline: 0`.

### 3.5 AI column

- Hidden unless `is-ai-open`
- `#aiChat`: thread + composer
- Mock replies: edit current answer or set “standing note” for room

---

## 4. Call experience (video stage)

### 4.1 State machine (implement faithfully)

```
                    ┌─────────────┐
                    │  pre-call   │  !inCall && !done
                    └──────┬──────┘
                           │ joinCall()
                           ▼
                    ┌─────────────┐
                    │   waiting   │  inCall && !candidateJoined
                    └──────┬──────┘  (10s timer CANDIDATE_JOIN_DELAY_MS)
                           │ markCandidateJoined()
                           ▼
                    ┌─────────────┐
                    │   active    │  inCall && candidateJoined && !done
                    └──────┬──────┘
                           │ endInterview()
                           ▼
                    ┌─────────────┐
                    │    ended    │  done / onSummary
                    └─────────────┘
```

Parallel UX flag: **`onSetup`** — when true, `#qStage` shows **setup-card** (category pills + job dropdown) instead of the active question. Default **`onSetup: true`** on fresh load.

- **First visit:** user sees setup in center; profile shows **call-lobby** until Join.
- **`leaveSetup()` / Next on setup:** if not in call → `joinCall()`; validates `canStart()`; forces candidate joined; starts mock script; `onSetup = false`.

### 4.2 Stage visuals (`renderStage`)

| Condition | `#stageInner` content |
|-----------|------------------------|
| Pre-call | `.call-lobby` — dark 16:9, “Camera off until you join” |
| Waiting | `.stage-waiting` — dark stage, initials avatar, spinner, message, **self** PiP |
| Active, no share | Candidate `.tile` + `.self` PiP (4:3) |
| Active, share | `.share-board` (fake IDE) + `.people-row` two tiles |
| Ended | `.call-ended` — grayscale avatar, “Call ended”, duration |

**Talking indicator:** `.tile.is-talking` / `.self.is-talking` — blue outline (`state.talking` from script).

**Camera off:** candidate tile shows SVG silhouette placeholder.

### 4.3 Call-dock (on-video controls)

- Sibling inside `.call-wrap`, repositioned in JS onto active host element
- Hidden: `is-pre-call`, `is-call-ended`
- **Hover reveal:** opacity 0 → 1 on `.call-wrap:hover` / `.tile:hover` / `.share-board:hover`
- Buttons `data-call`: mic, cam, share — classes `is-off` (mic/cam off), `is-on` (share on)
- Dark glass bar: `rgba(18,18,16,.72)`, 36px buttons

### 4.4 Topbar dock vs call-dock

- **Topbar `.dock`:** Join / End / Save and Close (call lifecycle)
- **In-stage `.call-dock`:** A/V controls only

---

## 5. Setup vs questions (center column)

### 5.1 Setup mode (`onSetup === true`)

Render `renderSetupStage()` → `.setup-card` inside `#qStage`:

- `.setup-meet` title from selected categories (e.g. `Cultural / Technical`) + demo datetime (`Tue, Sep 15, 2026 · 1:00 pm–2:00 pm (America/Chicago)`)
- Category pills, talent pool pills, and job dropdown (scoped under `.setup-card` in CSS)
- Hint warns if cultural/technical on but **no talent pool** selected; `canStart()` gates Next / join
- **While not in call:** `#nextPeek` hidden
- **While in call:** peek shows Previous (disabled) + **Next** (enabled when `canStart()`)

Interactions update `state.cultural`, `state.technical`, `state.poolIds`, `state.jobIds` → `applyQueueFromFlags()` → `persistLiveSet()` → re-render.

### 5.2 Active question mode

When `!onSetup && !done && !scriptOpen && queue non-empty`:

- **Kicker:** `01 · {group}`
- **`.q-prompt`:** question text (left-aligned, max 720px, clamp size)
- **`.q-answer`:** `contenteditable`-like div with `data-answer="{id}"`, placeholder *“Answer will land here from the transcript.”*
- **`#nextPeek`:** Previous | Next or **Finish interview**

**Coverage UI** exists in CSS (`.cov`, levels 0–3) but is **not** in current `renderQuestions` output — do not add unless spec’d later.

### 5.3 Script / “see all” mode

`state.scriptOpen` — full `.script-list` of all questions; `.script-item.is-now` enlarges current. Toggle wired to `#scriptToggle` in JS but **button absent from HTML** — treat as optional / out of scope unless you add control.

### 5.4 Post-call summary (`done` / `onSummary`)

- Tabs switch content:
  - **Summary:** ratings, English proficiency, editable note blocks, per-job fit sections, signals list
  - **Questions:** read-only script list with answers
  - **Transcript:** `wrapTranscriptHtml()` in stage (panel transcript hidden)
- **`#btnCloseScreen`:** validates star ratings → `saveInterviewSession()` → `vetting.html`
- Missing ratings: scroll to `.wrap-head.is-error`, toast message

### 5.5 Finish overlay

`#finishOverlay` — “End the call and open the summary?”  
- **Write summary** → `endInterview(false)`  
- **Keep interviewing** → dismiss  
- Triggered by Finish / keyboard right on last question

---

## 6. Categories, pools, and jobs (business rules)

### 6.1 Talent pools (`POOLS`)

| id | label |
|----|-------|
| `dotnet` | .NET Software Engineer |
| `backend` | Backend Engineer |

### 6.2 Cultural questions (`CULTURAL`)

Ids `c1`–`c4` — see `CULTURAL` array in `interview.html`.

### 6.3 Technical questions

Pulled from selected pool(s), ids `t1`–`t12` etc.

### 6.4 Jobs (`JOBS`)

Aviato, Wedge, Connective Talent, … (see `JOBS` in `interview.html`). Demo filter on load removes `reliacare` from saved ids in `loadQueue()`.

### 6.5 Queue ordering

1. Cultural (if on)  
2. Technical pool questions in pool order (if technical)  
3. Each selected job’s questions in job order  

### 6.6 Validation

- `missingPool()` = (cultural OR technical) AND `poolIds.length === 0`
- `canStart()` = !missingPool() AND (cultural OR technical OR jobIds.length > 0)

### 6.7 In-interview category UI (legacy CSS)

`.packs`, `.pack`, `.job-trigger`, `.job-menu` styles exist for an alternate chip UI — **not mounted** in current HTML. In-room editing uses **setup-card** only. Do not resurrect pack UI unless product asks.

---

## 7. Transcript

### 7.1 Panel (during call)

- `#transcriptPanel` default **`.is-collapsed`**
- Toggle: `#trToggle` → flips `state.captions` via `toggle('captions')`
- Label: `"Show transcript"` / `"Transcript"`
- Expanded (final CSS): **50% height** of q-panel; feed padding horizontal 72px
- Lines: `.line.you` (brand name color) / `.line.them` (blue-deep)

### 7.2 Mock script (`SCRIPT` array)

After `leaveSetup()`, `playScript()` runs timed steps:

- Adds transcript lines
- Sets `state.talking`
- **`typeInto(fillId, fill)`** animates answer text into matching question

Only steps whose `fillId` exists in current queue run.

### 7.3 Post-call

- Bottom transcript panel **hidden** (`body.is-call-ended .transcript { display: none }`)
- Use **Transcript tab** in `#qStage` instead

---

## 8. Keyboard & navigation

| Key | Context | Action |
|-----|---------|--------|
| `ArrowRight` | Setup | Join if needed + `leaveSetup()` |
| `ArrowLeft` | First question | `openSetup()` |
| `ArrowLeft/Right` | Questions | prev/next |
| `ArrowRight` | Last question | open finish overlay |
| `Escape` | Overlay / AI / script | close |

Outline / script list: click `data-jump` → `goQuestion(i)`.

---

## 9. Persistence keys

| Key | Purpose |
|-----|---------|
| `be-interview-set` | Question set flags + ids (in-room setup + live edits) |
| `be-interview-session` | Answers, index, ratings, summaries, elapsed, AI chat (`?resume=1`) |
| `be-profile-width` | Profile column width px |

**Load rules (`loadQueue`):** Apply `be-interview-set` from `localStorage` when present. **`be-interview-session`** restores only when URL has `?resume=1`.

---

## 10. Responsive rules (interview)

| Breakpoint | Changes |
|------------|---------|
| `1180px` | `--profile: 450px` |
| `980px` | Room → single column stack; split hidden; `app` min-height 100vh; body scroll; profile sticky unset; ended layout still 1 col |
| `720px` | Topbar wraps; dock buttons 40px; reduced horizontal padding (14px); wrap grids single column; setup job-opt stacks |

---

## 11. Mock content checklist

Implementer should keep demo copy unless product replaces it:

- **Candidate:** Marcelo Dosko, Córdoba, GMT-3, Unsplash face URLs as in HTML
- **Interviewer self-cam:** second Unsplash portrait
- **Work history:** Harbor Payments, Andes Logistics, Nexo Digital (full bullets in HTML)
- **Screenshare snippet:** `InventoryService.cs` / `ReserveAsync` theme
- **Summary defaults:** `defaultNote`, `defaultSummary`, `defaultJobFit`, `SIGNALS` arrays in script
- **English proficiency:** Novice → Fluent radio row; default Fluent

---

## 12. Explicitly out of scope (unless new ticket)

- Real video / WebRTC / Twilio / Daily
- Backend APIs, auth, multi-candidate
- `vetting.html` implementation (only link target)
- `pack` / `job-trigger` chip bar in question header (CSS only)
- `#scriptToggle` / “See all” unless you add DOM node
- `is-waiting-participant` styling (class is set; no rules yet)
- Removing duplicate CSS blocks in prototype (consumer should extract one theme)
- Linear dashboard / `server/linear-dashboard.mjs` (separate tool)
- Tests, CI, i18n

---

## 13. QA checklist (manual)

Use **local** and **GitHub Pages** URLs.

### Interview — lifecycle

- [ ] Fresh load: `is-pre-call`, lobby text, Join visible, setup in center, outline editable
- [ ] Setup: pills toggle cultural / technical / pools; outline updates count and groups
- [ ] Cultural+technical without pool → warning hint + disabled Next
- [ ] Job dropdown adds/removes pills; outline gains job group; `be-interview-set` persists
- [ ] Join → waiting UI ~10s → active video; clock counts
- [ ] Setup Next without categories → toast; with valid set → questions + script fills c1/c2
- [ ] Mic/cam/share on hover dock; share layout + toast
- [ ] End call → ended stage, summary tab, outline hidden, Rejoin works
- [ ] Finish on last Q → overlay → summary ratings
- [ ] Save and Close blocked until stars filled; then navigates to vetting
- [ ] `?resume=1` restores answers and position

### Interview — layout

- [ ] Profile | split | questions | outline | AI column grid at desktop
- [ ] Split drag persists width
- [ ] Outline fold collapses to icon rail; jump buttons work
- [ ] Edit set pencil returns to setup without losing call state
- [ ] Transcript expand/collapse; lines append during script
- [ ] AI panel opens/closes; column width 380px
- [ ] 980px stacks columns; 720px touch targets

### Parity

- [ ] Side-by-side with https://patricemmh.github.io/be-platform/interview.html — typography, colors, spacing, states
- [ ] Same on http://localhost:37689/interview.html after `npm run dev`

---

## 14. Suggested Claude Code task breakdown

1. **Extract** single canonical stylesheet from `interview.html` (resolve overrides).
2. **Component map:** Topbar, Room, Profile, Stage, QuestionStage, Outline, Transcript, AiChat, Overlays.
3. **Port state module** from inline script (or TypeScript) — preserve keys and transitions in §4–5.
4. **Share data module** for `CULTURAL`, `POOLS`, `JOBS`, `SCRIPT`, `DETAILS`.
5. **Wire route:** `/interview` matching query param behavior (`?resume=1`).
6. **Run QA checklist** §13; fix diffs against GitHub Pages reference.

---

## 15. File map

| File | Role |
|------|------|
| `interview.html` | Full interview room prototype (setup + room) |
| `assets/logo.svg` | Brand |
| `package.json` | `"dev": "serve -l 37689"` |
| `vetting.html` | Post-close navigation target |

---

*Generated for BE-Platform handoff. Update this doc when prototype HTML changes.*
