import { spawn } from "child_process";
import dotenv from "dotenv";
import express from "express";
import fs from "fs/promises";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";
import { LinearClient } from "@linear/sdk";
import {
  parseChecklist,
  setChecklistItem,
  removeChecklistItem,
} from "./checklist.mjs";
import { resolveDoneStateIdForIssue } from "./issue-status.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(ROOT, ".env") });
const PORT = Number(process.env.DASHBOARD_PORT || 3001);
const LOCAL_PROTOTYPE_PORT = Number(process.env.LOCAL_PROTOTYPE_PORT || 37689);
const GITHUB_PAGES_BASE = "https://patricemmh.github.io/be-platform/";

/** @type {import("child_process").ChildProcess | null} */
let prototypeChild = null;

function probeTcpPort(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(800);
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function waitForTcpPort(port, { attempts = 40, intervalMs = 250 } = {}) {
  for (let i = 0; i < attempts; i++) {
    if (await probeTcpPort(port)) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

async function ensurePrototypeServer() {
  if (process.env.SKIP_PROTOTYPE_SERVER === "1") return;
  const url = `http://localhost:${LOCAL_PROTOTYPE_PORT}`;
  if (await probeTcpPort(LOCAL_PROTOTYPE_PORT)) {
    console.log(`Prototype static server: ${url} (already running)`);
    return;
  }
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  prototypeChild = spawn(npm, ["run", "dev"], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  prototypeChild.on("error", (err) => {
    console.warn(`Could not start prototype server (${url}):`, err.message);
  });
  const up = await waitForTcpPort(LOCAL_PROTOTYPE_PORT);
  if (up) {
    console.log(`Prototype static server: ${url} (started with dashboard)`);
  } else {
    console.warn(
      `Prototype page links use ${url} but the server is not responding. Run \`npm run dev\` in another terminal.`
    );
  }
}

const PRIORITY_LABELS = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

const DEFAULT_TEAM_KEY = "BE";

/** @returns {{ teamKey: string, number: number } | null} */
function parseIssueIdentifier(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const withTeam = s.match(/^([A-Za-z]+)[\s-]*(\d+)$/);
  if (withTeam) {
    return {
      teamKey: withTeam[1].toUpperCase(),
      number: Number.parseInt(withTeam[2], 10),
    };
  }
  const digitsOnly = s.match(/^(\d+)$/);
  if (digitsOnly) {
    return {
      teamKey: DEFAULT_TEAM_KEY,
      number: Number.parseInt(digitsOnly[1], 10),
    };
  }
  return null;
}

function formatIdentifier({ teamKey, number }) {
  return `${teamKey}-${number}`;
}

async function lookupIssueByIdentifier(client, parsed) {
  const page = await client.issues({
    first: 1,
    filter: {
      team: { key: { eq: parsed.teamKey } },
      number: { eq: parsed.number },
    },
    includeArchived: false,
  });
  if (page.nodes[0]) return page.nodes[0];

  const term = formatIdentifier(parsed);
  const search = await client.issueSearch({ term, first: 5 });
  const hit = (search.nodes ?? []).find(
    (i) => i.identifier?.toUpperCase() === term
  );
  return hit ?? null;
}

function hasApiKey() {
  return Boolean(process.env.LINEAR_API_KEY?.trim());
}

function htmlFilenameToLabel(filename) {
  const base = filename.replace(/\.html$/i, "");
  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

async function listRootHtmlPages() {
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.html$/i.test(e.name))
    .map((e) => {
      const slug = e.name.replace(/\.html$/i, "");
      return {
        file: e.name,
        label: htmlFilenameToLabel(e.name),
        path: slug,
        isDashboard: e.name.toLowerCase() === "dashboard.html",
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

function getClient() {
  if (!hasApiKey()) return null;
  return new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
}

function serializeIssue(issue, state, assignee, labels, parentRef) {
  const description = issue.description ?? "";
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description,
    url: issue.url,
    priority: issue.priority,
    priorityLabel: PRIORITY_LABELS[issue.priority] ?? "Unknown",
    status: state?.name ?? "Unknown",
    statusType: state?.type ?? null,
    assignee: assignee
      ? { id: assignee.id, name: assignee.name, email: assignee.email }
      : null,
    labels: labels.map((l) => l.name),
    parentId: parentRef?.id ?? null,
    parentIdentifier: parentRef?.identifier ?? null,
    parentTitle: parentRef?.title ?? null,
    checklist: parseChecklist(description),
    updatedAt: issue.updatedAt,
  };
}

async function fetchAssignedIssues(client, userId) {
  const all = [];
  let cursor = undefined;
  const filter = {
    assignee: { id: { eq: userId } },
    team: { key: { eq: "BE" } },
  };

  for (;;) {
    const page = await client.issues({
      first: 50,
      after: cursor,
      filter,
      includeArchived: false,
    });
    all.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }
  return all;
}

async function fetchChildrenForParents(client, parentIds) {
  if (!parentIds.length) return [];
  const all = [];
  let cursor = undefined;
  const filter = { parent: { id: { in: parentIds } } };

  for (;;) {
    const page = await client.issues({
      first: 50,
      after: cursor,
      filter,
      includeArchived: false,
    });
    all.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }
  return all;
}

async function fetchOrgUsers(client) {
  const all = [];
  let cursor = undefined;

  for (;;) {
    const page = await client.users({ first: 50, after: cursor });
    all.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }

  return all
    .filter((u) => u.active && !u.app)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      displayName: u.displayName,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

async function hydrateIssue(client, issue) {
  const [state, assignee, parent, labelConn] = await Promise.all([
    issue.state,
    issue.assignee,
    issue.parent,
    issue.labels(),
  ]);
  const labels = labelConn.nodes ?? [];
  const parentRef = parent
    ? { id: parent.id, identifier: parent.identifier, title: parent.title }
    : null;
  return serializeIssue(issue, state, assignee, labels, parentRef);
}

async function buildDashboardPayload(client) {
  const viewer = await client.viewer;
  const assigned = await fetchAssignedIssues(client, viewer.id);
  const assignedById = new Map(assigned.map((i) => [i.id, i]));

  const assignedParentIds = assigned
    .filter((i) => !i.parentId)
    .map((i) => i.id);

  const children = await fetchChildrenForParents(client, assignedParentIds);
  const childByParent = new Map();
  for (const child of children) {
    const pid = child.parentId;
    if (!pid) continue;
    if (!childByParent.has(pid)) childByParent.set(pid, []);
    childByParent.get(pid).push(child);
  }

  const subAssignedOnly = assigned.filter((i) => i.parentId);
  const extraParentIds = [
    ...new Set(
      subAssignedOnly
        .map((i) => i.parentId)
        .filter((pid) => pid && !assignedById.has(pid))
    ),
  ];

  const extraParents = [];
  for (const pid of extraParentIds) {
    try {
      extraParents.push(await client.issue(pid));
    } catch {
      /* parent may be inaccessible */
    }
  }

  const parentIssues = [
    ...assigned.filter((i) => !i.parentId),
    ...extraParents,
  ];

  const seenParent = new Set();
  const parents = [];
  for (const p of parentIssues) {
    if (seenParent.has(p.id)) continue;
    seenParent.add(p.id);
    parents.push(p);
  }

  parents.sort((a, b) => (a.identifier > b.identifier ? -1 : 1));

  const rows = [];
  for (const parent of parents) {
    const hydratedParent = await hydrateIssue(client, parent);
    const isAssignedToViewer = assignedById.has(parent.id);
    let kids = childByParent.get(parent.id) ?? [];

    if (!isAssignedToViewer) {
      kids = kids.filter((c) => assignedById.has(c.id));
    }

    const subAssignedNotInKids = subAssignedOnly.filter(
      (s) => s.parentId === parent.id && !kids.some((k) => k.id === s.id)
    );
    kids = [...kids, ...subAssignedNotInKids];

    const uniqueKids = [...new Map(kids.map((k) => [k.id, k])).values()];
    uniqueKids.sort((a, b) => a.identifier.localeCompare(b.identifier));

    const childrenSerialized = await Promise.all(
      uniqueKids.map((c) => hydrateIssue(client, c))
    );

    rows.push({
      ...hydratedParent,
      children: childrenSerialized,
    });
  }

  const nestedChildIds = new Set(
    rows.flatMap((r) => r.children.map((c) => c.id))
  );
  const standalone = assigned.filter(
    (i) =>
      i.parentId &&
      !nestedChildIds.has(i.id) &&
      !seenParent.has(i.parentId)
  );

  const standaloneSerialized = await Promise.all(
    standalone.map((i) => hydrateIssue(client, i))
  );

  return {
    viewer: {
      id: viewer.id,
      name: viewer.name,
      email: viewer.email,
    },
    parents: rows,
    standalone: standaloneSerialized,
    fetchedAt: new Date().toISOString(),
  };
}

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/config", (_req, res) => {
  res.json({
    hasApiKey: hasApiKey(),
    port: PORT,
    localPrototypeBase: `http://localhost:${LOCAL_PROTOTYPE_PORT}`,
    workspaceRoot: ROOT,
    githubPagesBase: GITHUB_PAGES_BASE,
  });
});

app.get("/api/pages", async (_req, res) => {
  try {
    const pages = await listRootHtmlPages();
    res.set("Cache-Control", "no-store");
    res.json({ pages });
  } catch (err) {
    console.error("pages list failed:", err);
    res.status(500).json({
      error: "list_failed",
      message: err.message || "Failed to list HTML pages",
    });
  }
});

app.get("/api/dashboard", async (_req, res) => {
  if (!hasApiKey()) {
    return res.status(503).json({
      error: "missing_api_key",
      message:
        "LINEAR_API_KEY is not set. Copy .env.example to .env and add your key.",
    });
  }
  try {
    const client = getClient();
    const data = await buildDashboardPayload(client);
    res.json(data);
  } catch (err) {
    console.error("dashboard fetch failed:", err);
    res.status(500).json({
      error: "fetch_failed",
      message: err.message || "Failed to load Linear data",
    });
  }
});

app.get("/api/issues/lookup", async (req, res) => {
  if (!hasApiKey()) {
    return res.status(503).json({
      error: "missing_api_key",
      message:
        "LINEAR_API_KEY is not set. Copy .env.example to .env and add your key.",
    });
  }

  const parsed = parseIssueIdentifier(req.query.identifier);
  if (!parsed) {
    return res.status(400).json({
      error: "invalid_identifier",
      message: "Enter a ticket ID like BE-689, be689, or 689",
    });
  }

  try {
    const client = getClient();
    const issue = await lookupIssueByIdentifier(client, parsed);
    if (!issue) {
      return res.status(404).json({
        error: "not_found",
        message: `No issue ${formatIdentifier(parsed)} found`,
      });
    }
    const hydrated = await hydrateIssue(client, issue);
    res.json(hydrated);
  } catch (err) {
    console.error("issue lookup failed:", err);
    res.status(500).json({
      error: "lookup_failed",
      message: err.message || "Failed to look up issue",
    });
  }
});

app.patch("/api/issues/:id/checklist", async (req, res) => {
  if (!hasApiKey()) {
    return res.status(503).json({ error: "missing_api_key" });
  }
  const { checklistIndex, checked, delete: deleteItem } = req.body ?? {};
  if (typeof checklistIndex !== "number") {
    return res.status(400).json({
      error: "invalid_body",
      message:
        "Expected { checklistIndex: number, checked?: boolean, delete?: boolean }",
    });
  }
  const isDelete = deleteItem === true;
  if (isDelete) {
    if (checked !== undefined) {
      return res.status(400).json({
        error: "invalid_body",
        message: "Use either delete: true or checked, not both",
      });
    }
  } else if (typeof checked !== "boolean") {
    return res.status(400).json({
      error: "invalid_body",
      message: "Expected { checklistIndex: number, checked: boolean }",
    });
  }

  try {
    const client = getClient();
    const issue = await client.issue(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: "not_found" });
    }
    const description = issue.description ?? "";
    const newDescription = isDelete
      ? removeChecklistItem(description, checklistIndex)
      : setChecklistItem(description, checklistIndex, checked);
    const updated = await client.updateIssue(issue.id, {
      description: newDescription,
    });
    const success = updated?.success;
    const outIssue = success ? await updated.issue : issue;
    const finalDesc = outIssue?.description ?? newDescription;
    res.json({
      description: finalDesc,
      checklist: parseChecklist(finalDesc),
    });
  } catch (err) {
    console.error("checklist update failed:", err);
    res.status(500).json({
      error: "update_failed",
      message: err.message || "Failed to update checklist",
    });
  }
});

app.get("/api/users", async (_req, res) => {
  if (!hasApiKey()) {
    return res.status(503).json({
      error: "missing_api_key",
      message:
        "LINEAR_API_KEY is not set. Copy .env.example to .env and add your key.",
    });
  }

  try {
    const client = getClient();
    const users = await fetchOrgUsers(client);
    res.json({ users });
  } catch (err) {
    console.error("users fetch failed:", err);
    res.status(500).json({
      error: "fetch_failed",
      message: err.message || "Failed to load Linear users",
    });
  }
});

app.patch("/api/issues/:id/assignee", async (req, res) => {
  if (!hasApiKey()) {
    return res.status(503).json({
      error: "missing_api_key",
      message:
        "LINEAR_API_KEY is not set. Copy .env.example to .env and add your key.",
    });
  }

  let assigneeId = req.body?.assigneeId;
  if (assigneeId === "") assigneeId = null;
  if (assigneeId !== null && assigneeId !== undefined && typeof assigneeId !== "string") {
    return res.status(400).json({
      error: "invalid_body",
      message: "Expected { assigneeId: string | null }",
    });
  }
  if (assigneeId === undefined) {
    return res.status(400).json({
      error: "invalid_body",
      message: "Expected { assigneeId: string | null }",
    });
  }

  try {
    const client = getClient();
    const issue = await client.issue(req.params.id);
    if (!issue) {
      return res.status(404).json({
        error: "not_found",
        message: "Issue not found",
      });
    }

    const updated = await client.updateIssue(issue.id, { assigneeId });
    if (!updated?.success) {
      return res.status(500).json({
        error: "update_failed",
        message: "Linear did not accept the assignee change",
      });
    }

    const outIssue = updated.issue ? await updated.issue : issue;
    const hydrated = await hydrateIssue(client, outIssue);
    res.json(hydrated);
  } catch (err) {
    console.error("assignee update failed:", err);
    const msg = err.message || "Failed to update issue assignee";
    const status =
      /not found|could not find/i.test(msg) ? 404 : /permission|forbidden|auth/i.test(msg) ? 403 : 500;
    res.status(status).json({
      error: "update_failed",
      message: msg,
    });
  }
});

app.patch("/api/issues/:id/status", async (req, res) => {
  if (!hasApiKey()) {
    return res.status(503).json({
      error: "missing_api_key",
      message:
        "LINEAR_API_KEY is not set. Copy .env.example to .env and add your key.",
    });
  }

  const desired = String(req.body?.status ?? "done").toLowerCase();
  if (desired !== "done") {
    return res.status(400).json({
      error: "invalid_body",
      message: 'Only { "status": "done" } is supported',
    });
  }

  try {
    const client = getClient();
    const issue = await client.issue(req.params.id);
    if (!issue) {
      return res.status(404).json({
        error: "not_found",
        message: "Issue not found",
      });
    }

    const stateId = await resolveDoneStateIdForIssue(client, issue);
    const updated = await client.updateIssue(issue.id, { stateId });
    if (!updated?.success) {
      return res.status(500).json({
        error: "update_failed",
        message: "Linear did not accept the status change",
      });
    }

    const outIssue = updated.issue ? await updated.issue : issue;
    const hydrated = await hydrateIssue(client, outIssue);
    res.json(hydrated);
  } catch (err) {
    console.error("status update failed:", err);
    const msg = err.message || "Failed to update issue status";
    const status =
      /not found|could not find/i.test(msg) ? 404 : /permission|forbidden|auth/i.test(msg) ? 403 : 500;
    res.status(status).json({
      error: "update_failed",
      message: msg,
    });
  }
});

app.use(express.static(ROOT));

app.get("/", (_req, res) => {
  res.redirect("/dashboard.html");
});

async function main() {
  await ensurePrototypeServer();
  app.listen(PORT, () => {
    console.log(`Linear dashboard: http://localhost:${PORT}/dashboard.html`);
    if (!hasApiKey()) {
      console.warn("Warning: LINEAR_API_KEY is not set — API routes will return 503.");
    }
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

function shutdownPrototypeChild() {
  if (prototypeChild && !prototypeChild.killed) {
    prototypeChild.kill();
  }
}

process.on("exit", shutdownPrototypeChild);
process.on("SIGINT", () => {
  shutdownPrototypeChild();
  process.exit(0);
});
process.on("SIGTERM", () => {
  shutdownPrototypeChild();
  process.exit(0);
});
