// Completion oracle: only successful machine receipts satisfy criteria.

import { validateArtifactReceipt, validateReceipt } from "./receipts.mjs";
import { fingerprintWorkspace, sameWorkspaceFingerprint } from "./workspace.mjs";

export function evaluate(state, { cwd = state?.__cswCwd } = {}) {
  const reasons = [];
  if (!state || !Array.isArray(state.criteria) || state.criteria.length === 0) {
    return { done: false, reasons: ["no success criteria defined"] };
  }
  for (const criterion of state.criteria) {
    const receipt = criterion.receipt;
    if (criterion.status !== "pass") {
      reasons.push(`${criterion.id}: status is "${criterion.status}" (need "pass")`);
    } else if (!receipt || typeof receipt !== "object") {
      reasons.push(`${criterion.id}: passed without a machine receipt`);
    } else if (!validateReceipt(receipt).valid) {
      reasons.push(`${criterion.id}: receipt schema is invalid`);
    } else if (receipt.criterionRevision + 1 !== criterion.revision) {
      reasons.push(`${criterion.id}: receipt is bound to a different criterion revision`);
    } else if (receipt.type === "verify") {
      if (receipt.exitCode !== 0 || receipt.timedOut === true || receipt.errorCode || receipt.output?.limitExceeded) {
        reasons.push(`${criterion.id}: verification receipt did not exit 0 cleanly`);
      } else {
        // Non-git receipts explicitly carry no freshness guarantee. This is
        // ordinary staleness detection, not authentication against same-user edits.
        if (!cwd && receipt.workspace.available) {
          reasons.push(`${criterion.id}: workspace cannot be recomputed without cwd`);
        } else if (!cwd) {
          // Structural unit callers can evaluate an explicitly unavailable receipt.
        } else if (receipt.workspace.available) {
          const currentWorkspace = fingerprintWorkspace(cwd);
          if (!currentWorkspace.available || !sameWorkspaceFingerprint(receipt.workspace, currentWorkspace)) {
            reasons.push(`${criterion.id}: workspace changed after verification`);
          }
        } else {
          const currentWorkspace = fingerprintWorkspace(cwd);
          if (receipt.workspace.reason !== "not-git" || currentWorkspace.available || currentWorkspace.reason !== "not-git") {
            reasons.push(`${criterion.id}: workspace fingerprint availability changed after verification`);
          }
        }
      }
    } else if (receipt.type === "artifact") {
      const validation = validateArtifactReceipt(receipt, cwd);
      if (!validation.valid) reasons.push(`${criterion.id}: ${validation.reason}`);
    } else {
      reasons.push(`${criterion.id}: unsupported receipt type "${receipt.type}"`);
    }
  }
  for (const blocker of (state.reviewBlockers || []).filter((item) => !item.resolved)) {
    reasons.push(`unresolved review blocker: ${blocker.id} (${blocker.reason})`);
  }
  return { done: reasons.length === 0, reasons };
}

export const isComplete = (state, options) => evaluate(state, options).done;
