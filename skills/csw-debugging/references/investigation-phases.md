# Investigation phases

## Phase 0 — Safety and scope

- Identify data-loss, credential, remote-system, and destructive-operation risk.
- Confirm authorized environment and repository boundary.
- Preserve dirty work and current runtime state.
- Decide which artifacts may contain private data and how they will be redacted.

Exit when reproduction can proceed safely.

## Phase 1 — Reproduction packet

Capture:

- observable symptom and expected behavior;
- exact command or interaction;
- input or minimal fixture;
- exit status and decisive output;
- version, commit, runtime, architecture, and configuration source;
- frequency and last known working state.

Do not summarize away the error token, status code, signal, timestamp, or mismatch that makes
the failure identifiable.

## Phase 2 — Execution map

Trace the path from user surface to failure:

1. entry command, route, hook, or UI action;
2. parsing and configuration;
3. orchestration and state transition;
4. adapter or dependency boundary;
5. serialization, packaging, or output;
6. cleanup and error translation.

Mark where evidence exists and where behavior is inferred.

## Phase 3 — Hypothesis table

| Hypothesis | Mechanism | If true | Falsifier | Probe | Result |
| --- | --- | --- | --- | --- | --- |
| H1 | | | | | |
| H2 | | | | | |
| H3 | | | | | |

Choose the probe with the highest information gain and lowest risk, not the probe that best
confirms the current favorite.

## Phase 4 — Narrowing

- Remove unrelated input while preserving the symptom.
- Freeze versions and configuration.
- Compare working and failing artifacts or environments one dimension at a time.
- Use binary search only when states are reproducible and the range is trustworthy.
- Preserve the first minimal reproduction that still crosses the real boundary.

## Phase 5 — Causal proof

Demonstrate that changing the suspected cause changes the outcome while other relevant factors
remain fixed. Prefer a regression test or controlled A/B probe. If causality cannot be tested,
state the strongest supported correlation and the missing experiment.

## Phase 6 — Fix and regression

- Add failing regression coverage.
- Apply the smallest causal repair.
- Verify adjacent behavior and error semantics.
- Exercise the original surface.
- Compare installed or packaged artifacts when distribution is involved.

## Phase 7 — QA and cleanup

- Run happy, edge, regression, and failure scenarios.
- Remove temporary logging and probes.
- Stop processes and release ports.
- Delete disposable fixtures and credentials.
- Record cleanup receipt and evidence paths.

## Stuck investigation reset

After two uninformative rounds:

1. restate what is observed versus inferred;
2. select a different layer or observation tool;
3. ask what evidence would prove the leading hypothesis wrong;
4. compare a known-good artifact or environment;
5. request review or missing authority if needed.

Do not keep increasing verbosity, timeout, retries, or log volume without a discriminating
question.

## Reproduction quality rubric

| Grade | Description | Action |
| --- | --- | --- |
| A | deterministic, minimal, real boundary, exact artifact | proceed to causal proof |
| B | deterministic but uses a reduced adapter or fixture | verify original surface later |
| C | intermittent with seed/timing captured | improve observation and repetition |
| D | symptom reported but not reproduced | gather environment and occurrence evidence |

## Investigation notes template

```text
Observation:
Expected:
Artifact/runtime:
Command:
Exit status:
Hypotheses:
Probe and reason:
Result:
Interpretation:
Next falsifier:
Cleanup receipt:
```

## Boundary probes

Prefer one-factor comparisons: known-good versus failing artifact, clean versus stale state,
authorized versus unauthorized input, supported versus unsupported version, serial versus parallel,
and source checkout versus installed package. Change only one meaningful dimension per probe.

## Evidence freshness

Re-run drift-prone observations before the verdict: installed version, process list, port state,
remote status, generated artifact, dependency registry, and configuration origin. Old logs can
explain history but cannot prove the current surface is repaired.
