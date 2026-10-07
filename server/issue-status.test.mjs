import test from "node:test";
import assert from "node:assert/strict";
import { pickDoneStateId } from "./issue-status.mjs";

test("pickDoneStateId prefers exact Done name", () => {
  const id = pickDoneStateId([
    { id: "a", name: "In Progress", type: "started" },
    { id: "b", name: "Done", type: "completed" },
    { id: "c", name: "Canceled", type: "canceled" },
  ]);
  assert.equal(id, "b");
});

test("pickDoneStateId falls back to completed type", () => {
  const id = pickDoneStateId([
    { id: "x", name: "Shipped", type: "completed" },
    { id: "y", name: "In Review", type: "started" },
  ]);
  assert.equal(id, "x");
});

test("pickDoneStateId returns null when no completed state", () => {
  assert.equal(
    pickDoneStateId([{ id: "z", name: "Todo", type: "unstarted" }]),
    null
  );
});
