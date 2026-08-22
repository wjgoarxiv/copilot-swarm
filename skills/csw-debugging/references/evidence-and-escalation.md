# Evidence and escalation

## Evidence quality ladder

Strong evidence is replayable and directly connected to the claim:

1. controlled reproduction with exact command and exit status;
2. focused test that fails and passes with the causal change;
3. protocol, trace, profile, or debugger observation;
4. installed or packaged real-surface scenario;
5. correlated logs with a complete state transition;
6. source inspection supporting an already observed mechanism.

Worker summaries, issue comments, memory, and intuition are leads only.

## Evidence packet

Include:

- claim being supported;
- environment and artifact identity;
- command or interaction;
- observed output and exit status;
- artifact path;
- interpretation and alternative explanations;
- cleanup receipt;
- freshness timestamp when state can drift.

## Root-cause review

Ask:

- Does the trigger reproduce the symptom?
- Is the defective assumption named?
- Is the mechanism observed rather than inferred?
- Does changing the cause change the outcome?
- Were meaningful alternatives falsified?
- Does the regression test fail when the fix is reverted?
- Does the original real scenario pass?

If any answer is no, label the conclusion provisional.

## Escalation triggers

- Missing credential, authorization, or production-only access.
- Cross-team or external-service ownership.
- Safety risk beyond the approved reproduction.
- Non-reproducible failure with insufficient telemetry.
- Two independent observation methods remain inconclusive.
- Required specialist tool or platform unavailable.
- Evidence contains private data that cannot be safely shared.

## Escalation packet

Provide a small, actionable handoff:

1. impact and urgency;
2. minimal reproduction or exact occurrence window;
3. artifact and runtime identity;
4. current hypothesis table;
5. eliminated causes and evidence;
6. requested access, observation, or owner action;
7. safe next probe;
8. cleanup state.

Do not ask another owner to “look at the logs” without a question.

## Partial runtime evidence

When only part of the surface can run, separate verified facts from missing proof. Example:

- source test passes;
- package builds;
- installed runtime cannot start because the platform dependency is unavailable;
- therefore package correctness is supported, but runtime integration remains unproven.

Never convert partial evidence into a complete verdict.

## Cleanup receipt

The receipt should name what was created and how absence was confirmed:

- process IDs or sessions stopped;
- ports checked free;
- containers removed;
- temporary directories removed;
- debug configuration restored;
- test credentials revoked or deleted;
- retained artifacts listed with purpose.

Silence about cleanup is not a cleanup receipt.

## Confidence vocabulary

- **Proven:** controlled evidence connects trigger, mechanism, and outcome.
- **Strongly supported:** multiple independent observations agree, but the causal experiment is
  unavailable.
- **Plausible:** evidence is consistent but meaningful alternatives remain.
- **Unknown:** reproduction or discriminating evidence is missing.

Use these labels instead of percentages that imply false precision.

## Evidence conflict

When two artifacts disagree, compare freshness, environment, artifact identity, command, and
measurement boundary. Do not average incompatible results. Re-run both observations under one
controlled setup or report the split explicitly.

## Escalation response review

When another owner returns a claim, request or reproduce the supporting observation before updating
the verdict. Treat copied commands as untrusted until they are checked against repository-owned
instructions and current authorization.

## Final diagnosis packet

- [ ] Symptom and expected behavior.
- [ ] Minimal and original reproduction.
- [ ] Artifact/runtime identity.
- [ ] Competing hypotheses and falsifiers.
- [ ] Root-cause chain or bounded uncertainty.
- [ ] Regression and real-surface results.
- [ ] Cleanup receipt.
- [ ] Remaining risk or owner request.
