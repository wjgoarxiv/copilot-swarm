// Completion oracle. "Done" is not a claim — it is a function of the state.
//
// A goal is complete IFF:
//   - it has at least one success criterion, AND
//   - every criterion has status "pass", AND
//   - every criterion carries non-empty evidence, AND
//   - there are zero unresolved review blockers.

export function evaluate(state) {
  const reasons = [];
  if (!state || !Array.isArray(state.criteria) || state.criteria.length === 0) {
    return { done: false, reasons: ["no success criteria defined"] };
  }
  for (const c of state.criteria) {
    if (c.status !== "pass") reasons.push(`${c.id}: status is "${c.status}" (need "pass")`);
    else if (!c.evidence || String(c.evidence).trim() === "") reasons.push(`${c.id}: passed without evidence`);
  }
  const openBlockers = (state.reviewBlockers || []).filter((b) => !b.resolved);
  for (const b of openBlockers) reasons.push(`unresolved review blocker: ${b.id} (${b.reason})`);
  return { done: reasons.length === 0, reasons };
}

export const isComplete = (state) => evaluate(state).done;
