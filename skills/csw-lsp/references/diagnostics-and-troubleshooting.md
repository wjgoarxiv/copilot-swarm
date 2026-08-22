# Diagnostics and troubleshooting

Classify the failure before changing configuration. Language-server incidents often
look alike at the UI while occurring at different layers.

## Failure taxonomy

| Layer | Typical symptom | First evidence |
| --- | --- | --- |
| Discovery | executable not found or wrong version | resolution path, version probe, exit status |
| Startup | process exits immediately | sanitized stderr, fixed arguments, working directory |
| Matching | server never attaches to a file | file type, language mapping, native status |
| Root | imports unresolved or wrong project loaded | selected root, markers, known definition path |
| Initialization | process lives but capabilities never appear | handshake state, timeout, server log class |
| Synchronization | changes do not affect results | open/change/save behavior, document version |
| Semantic request | definition, references, or rename fails | method, target symbol, response/error class |
| Diagnostics | missing, duplicated, or stale messages | clean/defect/restore sequence and publishers |
| Shutdown | orphan or duplicate process | process count before and after bounded stop |

Do not translate every timeout into “server is slow.” It may be waiting on a build
tool, scanning the wrong root, blocked on an interactive prompt, or failing to send
an initialization response.

## Fast triage

1. Confirm the command resolves in the same environment the host uses.
2. Capture the version and compare it with the repository language level.
3. Check file-to-language matching on one representative file.
4. Inspect the chosen root and its markers.
5. Observe initialization separately from process existence.
6. Run one small definition request before a repository-wide reference query.
7. Stop the session and verify cleanup.

This sequence minimizes expensive indexing while preserving the dependency chain.

## Startup failures

For an immediate exit, inspect:

- executable path and execute permission;
- fixed arguments and whether the server expects a transport flag;
- working directory and missing configuration;
- runtime or SDK compatibility;
- accidental shell syntax in an argv declaration;
- a project-local shim whose dependency install is incomplete.

Do not retry indefinitely. Bound attempts, preserve the first distinct error, and
report the missing prerequisite.

## Initialization timeout

When startup succeeds but initialization times out:

1. confirm the server is using the expected protocol transport;
2. check whether it spawned an interactive prompt or child process;
3. inspect root size and generated/vendor directories;
4. look for a build-system import waiting on network or credentials;
5. run a smaller known project only if it helps distinguish server health from
   repository configuration;
6. stop all probe processes and verify cleanup before retrying.

Increase a timeout only after evidence shows useful work is progressing and the
expected index duration is bounded.

## Wrong-root symptoms

Common signs include:

- standard-library symbols work but project symbols do not;
- definitions resolve into a sibling package unexpectedly;
- diagnostics use the wrong language version;
- duplicate project instances appear;
- references omit cross-package call sites;
- generated or vendored trees dominate indexing.

Compare the native status root with the language toolchain's own project graph. Fix
markers or workspace configuration before replacing the server.

## Diagnostic verification

Use a three-state sequence:

1. **Clean:** record diagnostics for a valid tracked file.
2. **Defect:** create a minimal reversible syntax or type error and wait for a
   relevant diagnostic tied to the expected range.
3. **Restored:** undo only the probe change and confirm that diagnostic clears.

Preserve unrelated diagnostics instead of treating them as probe failures. If the
message remains after restore, test document synchronization and diagnostic
publisher identity.

## Duplicate or stale diagnostics

If the same issue appears twice, identify all active publishers. A stale process,
duplicate native declaration, editor integration, or overlapping root may be
responsible.

If diagnostics update only after save, record that synchronization mode rather than
claiming live updates. If a closed file remains diagnosed, verify the server's
document lifecycle and workspace-diagnostic behavior.

## Semantic request failures

For definition, reference, and rename problems, record:

- file and symbol kind without copying source bodies;
- whether the symbol is local, imported, generated, or dependency-owned;
- expected result path or edit set;
- response, empty response, timeout, or protocol error;
- whether a simpler symbol works in the same root.

An empty result may be valid for dynamic or generated constructs. Use a known static
symbol as the readiness probe.

## Rename safety

Preview the edit set before application. Reject or pause when it:

- touches generated, vendored, ignored, or unrelated files;
- changes text occurrences that are not symbol references;
- omits a known reference;
- crosses an unexpected project boundary;
- conflicts with dirty user changes;
- cannot be followed by repository validation.

If rename is unsupported, report that capability as unsupported. Do not simulate a
semantic rename with blind search-and-replace.

## Logs and privacy

Capture the smallest useful log window. Sanitize source text, credentials, home
paths, URLs with tokens, and environment dumps. Preserve timestamps, error classes,
method names, root identity, and process exit status when they are needed to explain
the failure.

## Escalation packet

When blocked, provide:

```text
Status layer:
Language and project root:
Server command and version:
First failing transition:
Minimal reproduction scenario:
Expected result:
Observed error class:
Attempts already ruled out:
Approval or external prerequisite needed:
Cleanup verified:
```

This packet should allow the next operator to resume at the failing layer instead
of repeating the entire setup.
