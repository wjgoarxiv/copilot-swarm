# Tool selection

## Select by question

| Question | First useful tool class |
| --- | --- |
| Which code path ran? | structured log, trace, focused instrumentation |
| Where is time spent? | profiler or timing trace |
| Why did a process exit? | exit status, signal report, crash dump |
| Why is it hanging? | thread/task/goroutine dump, open-handle inspection |
| What bytes crossed the boundary? | protocol capture with redaction |
| Which artifact loaded? | resolver, package metadata, executable identity |
| What changed between versions? | diff, bisect, artifact comparison |
| Is memory unsafe or corrupt? | sanitizer, runtime checker, debugger |
| Is UI output wrong? | fresh screenshot, DOM/accessibility tree, console/network log |

Use the lightest tool that can falsify a hypothesis.

## Logs

Prefer existing structured fields. Add temporary fields only for a named question. Include time,
correlation identifier, state transition, and causal error—not secrets or full user payloads.
Remove diagnostic logging after the regression is protected.

## Debuggers

Use a debugger when control flow, state, crash location, or thread interaction cannot be observed
more cheaply. Record breakpoints and commands required to reproduce. Do not attach to unrelated or
production processes without authority.

## Traces and profiles

Bind duration, workload, warmup, sampling mode, and overhead. A profile without a comparable
baseline cannot prove a regression. Keep trace files only when they are safe and necessary.

## Protocol capture

Record framing, request/response identifiers, status, timing, and shutdown. Redact credentials and
private content. Prefer a local fixture when live traffic would expose data.

## Static and symbol tools

Use repository search for text, language-server operations for symbol-aware navigation, and AST
tools for structural patterns. Verify that the language server actually initialized before
trusting empty results.

## Binary analysis

Only use reverse-engineering tools when the binary is in scope and source/runtime evidence cannot
answer the question. Record binary hash, architecture, symbols, and provenance. Never execute an
unknown sample merely to inspect it.

## Browser inspection

Capture fresh evidence at the failing route and state. Use accessibility and computed layout data
for semantic or alignment questions, network evidence for transport questions, and screenshots for
visual outcomes. Do not infer installed behavior from repository source alone.

## Tool hygiene

- [ ] Tool answers a named question.
- [ ] Input and target are authorized.
- [ ] Output is redacted.
- [ ] Overhead and perturbation are understood.
- [ ] Command and exit status are recorded.
- [ ] Temporary processes and artifacts have a cleanup receipt.

## Choosing between source and runtime evidence

Source search answers what can happen. Runtime evidence answers what did happen. Use source to map
possible paths, then obtain a runtime observation before claiming which path produced the symptom.
An unreachable-looking branch may be selected through reflection, generated configuration, or an
older installed artifact.

## Tool failure handling

If a diagnostic tool fails:

1. record its command and exit status;
2. distinguish missing tool, unsupported target, permission, corrupt artifact, and tool defect;
3. do not modify the target merely to satisfy the tool;
4. select an equivalent observation method when possible;
5. report the evidence gap when no truthful substitute exists.

## Intrusiveness ladder

1. read existing metadata and logs;
2. reproduce with built-in verbosity;
3. inspect process or protocol state;
4. run a profiler or debugger;
5. add temporary instrumentation;
6. modify scheduling or timing only as an experiment.

Changes at levels 5–6 can hide races or alter behavior. Compare against the uninstrumented
reproduction before drawing conclusions.

## Evidence storage

Name artifacts by scenario and timestamp, keep them inside an approved evidence directory, redact
private data, and document the command needed to regenerate them. Delete large or sensitive traces
when they are no longer required.
