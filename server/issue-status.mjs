/**
 * Pick the workflow state id to use when marking an issue Done.
 * @param {{ id: string, name: string, type: string }[]} states
 */
export function pickDoneStateId(states) {
  if (!states?.length) return null;

  const exactDone = states.find((s) => s.name === "Done");
  if (exactDone) return exactDone.id;

  const completed = states.filter((s) => s.type === "completed");
  const doneNamed = completed.find((s) => /^done$/i.test(s.name.trim()));
  if (doneNamed) return doneNamed.id;

  if (completed.length === 1) return completed[0].id;

  const sorted = [...completed].sort((a, b) => a.name.localeCompare(b.name));
  return sorted[0]?.id ?? null;
}

/** @param {import("@linear/sdk").LinearClient} client */
export async function resolveDoneStateIdForIssue(client, issue) {
  const team = await issue.team;
  if (!team) {
    throw new Error("Could not resolve team for this issue");
  }
  const statesConn = await team.states();
  const states = (statesConn.nodes ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
  }));
  const stateId = pickDoneStateId(states);
  if (!stateId) {
    throw new Error("No Done/completed workflow state found for this team");
  }
  return stateId;
}
