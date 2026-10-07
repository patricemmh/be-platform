import test from "node:test";
import assert from "node:assert/strict";
import {
  parseChecklist,
  setChecklistItem,
  removeChecklistItem,
} from "./checklist.mjs";

const SAMPLE = `Intro line

- [ ] First task
- [x] Second task
- [ ] Third task

Footer`;

test("removeChecklistItem removes the correct line", () => {
  const out = removeChecklistItem(SAMPLE, 1);
  const items = parseChecklist(out);
  assert.equal(items.length, 2);
  assert.equal(items[0].text, "First task");
  assert.equal(items[1].text, "Third task");
  assert.ok(!out.includes("Second task"));
  assert.ok(out.includes("Intro line"));
  assert.ok(out.includes("Footer"));
});

test("removeChecklistItem preserves other checklist marks", () => {
  const out = removeChecklistItem(SAMPLE, 0);
  assert.match(out, /- \[x\] Second task/);
  assert.match(out, /- \[ \] Third task/);
});

test("removeChecklistItem throws on invalid index", () => {
  assert.throws(() => removeChecklistItem(SAMPLE, 5), /Invalid checklist index/);
});

test("setChecklistItem still toggles after remove", () => {
  const trimmed = removeChecklistItem(SAMPLE, 1);
  const toggled = setChecklistItem(trimmed, 0, true);
  assert.match(toggled, /- \[x\] First task/);
});
