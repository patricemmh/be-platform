/** Parse markdown task lines `- [ ]` / `- [x]` from a description. */
const CHECKBOX_RE = /^(\s*)- \[([ xX])\]\s*(.*)$/;

export function parseChecklist(description) {
  if (!description) return [];
  const lines = description.split("\n");
  const items = [];
  lines.forEach((line, lineNumber) => {
    const m = line.match(CHECKBOX_RE);
    if (!m) return;
    items.push({
      lineNumber,
      indent: m[1],
      checked: m[2].toLowerCase() === "x",
      text: m[3],
    });
  });
  return items;
}

/** Toggle checklist item by index (among checkbox lines only). */
export function setChecklistItem(description, checklistIndex, checked) {
  const items = parseChecklist(description ?? "");
  if (checklistIndex < 0 || checklistIndex >= items.length) {
    throw new Error("Invalid checklist index");
  }
  const lines = (description ?? "").split("\n");
  const { lineNumber, indent, text } = items[checklistIndex];
  const mark = checked ? "x" : " ";
  lines[lineNumber] = `${indent}- [${mark}] ${text}`;
  return lines.join("\n");
}

/** Remove a checklist line by index (among checkbox lines only). */
export function removeChecklistItem(description, checklistIndex) {
  const items = parseChecklist(description ?? "");
  if (checklistIndex < 0 || checklistIndex >= items.length) {
    throw new Error("Invalid checklist index");
  }
  const lines = (description ?? "").split("\n");
  const { lineNumber } = items[checklistIndex];
  lines.splice(lineNumber, 1);
  return lines.join("\n");
}
