# LSP verification scenarios

Select scenarios that match the capabilities promised by the repository. Run them
in a fresh session after the final configuration change.

## Scenario record

For every scenario, capture:

```text
Scenario:
Representative file and symbol:
Selected root:
Precondition:
Action:
Expected result:
Observed result:
Capability state: PASS | DEGRADED | UNSUPPORTED | FAIL
Evidence location:
Cleanup or restoration:
```

Use repository-relative paths where possible. Evidence should prove the result
without exposing source bodies or secrets.

## 1. Definition

Choose a statically resolvable symbol with a known definition in another file.

1. Open the tracked representative file.
2. request go-to-definition;
3. compare the returned path and location with the expected definition;
4. confirm the result belongs to the intended root or valid dependency graph;
5. repeat once for a project symbol rather than only a standard-library symbol.

Pass requires the correct path and a plausible location. A non-empty but wrong
result is a failure.

## 2. References

Choose a symbol with at least one known reference.

1. request references from its definition or use site;
2. confirm the known call site is included;
3. inspect whether declarations are included consistently;
4. check that results do not spill into unrelated generated or sibling projects;
5. record bounded response time for a representative query.

If definition passes but references timeout or omit a known site, mark the server
`DEGRADED`.

## 3. Rename impact and authorized application

Use a private or test-only symbol whose expected edit set is easy to enumerate.

1. use repository search and references to build a read-only expected edit set;
2. compare known definitions and references with generated, vendored, ignored, or unrelated paths;
3. call native rename only when the user requested it and the working tree permits a safe diff;
4. inspect the complete applied edit set;
5. compare it with the expected set and run repository validation.

If the language server does not advertise rename, record `UNSUPPORTED`. Never
replace this scenario with blind text replacement.

## 4. Diagnostic lifecycle

Use a tracked file that can be safely and reversibly edited.

1. capture the clean diagnostic state;
2. introduce one minimal syntax or type defect;
3. wait for a diagnostic with the expected category and range;
4. restore the exact probe change;
5. confirm the probe diagnostic clears;
6. preserve unrelated user changes and pre-existing diagnostics.

Pass requires both appearance and clearing. A message that appears but remains stale
after restore is a synchronization failure.

## 5. Malformed source resilience

Open or create an approved temporary source file containing a bounded malformed
construct.

- the server should publish an actionable diagnostic or a stable empty result;
- the session should remain available for a valid file afterward;
- no retry storm or duplicate process should remain;
- the temporary file must be removed unless retained as explicit evidence.

This proves that malformed input does not kill the entire language service.

## 6. Unsupported file behavior

Open a file extension outside the declaration's language mapping.

- native status should not falsely attach the server;
- the host should report unsupported capability gracefully;
- repeated status checks should not spawn duplicate processes;
- other supported files should continue to work.

Do not broaden the mapping merely to make this scenario produce a result.

## 7. Nested-root selection

For a repository with nested projects:

1. probe a parent-project file and record its root;
2. probe a nested-project file and record its root;
3. request one known definition in each;
4. confirm settings and results do not cross the intended boundary;
5. restart between probes if the host does not isolate roots automatically.

Pass requires both semantic correctness and correct root identity.

## 8. Multi-root or workspace behavior

For a declared workspace, choose a symbol that legitimately crosses package
boundaries and another that must remain package-local.

- the cross-package symbol should resolve according to workspace metadata;
- the local symbol should not collect unrelated sibling references;
- diagnostics should use each package's correct configuration;
- indexing should exclude generated and vendored trees as configured.

If the server lacks native multi-root support, document the supported package-root
workflow and mark the workspace-wide capability `UNSUPPORTED`.

## 9. Timeout and cancellation

Run only an approved bounded semantic request.

1. record the normal response time;
2. exercise the host's supported cancellation or bounded timeout path;
3. verify the request stops without taking down unrelated ready sessions;
4. verify no orphan child process remains;
5. repeat a small definition request to confirm recovery.

Do not use an unbounded repository-wide request merely to force a timeout.

## 10. Restart and cleanup

After all probes:

1. stop or reload the language-server session through the native surface;
2. verify the old process exits;
3. start a fresh session and repeat the smallest definition probe;
4. stop temporary servers and remove temporary malformed files;
5. inspect the working tree to prove probe changes were restored.

Cleanup is part of the verification result, not an optional afterthought.

## Final capability matrix

| Capability | Result | Evidence | Limitation |
| --- | --- | --- | --- |
| Definition |  |  |  |
| References |  |  |  |
| Rename impact/application |  |  |  |
| Diagnostic appearance |  |  |  |
| Diagnostic clearing |  |  |  |
| Malformed resilience |  |  |  |
| Unsupported file behavior |  |  |  |
| Nested or multi-root behavior |  |  |  |
| Timeout and recovery |  |  |  |
| Restart and cleanup |  |  |  |

The overall verdict is `READY` only when every capability promised by the package
passes and cleanup is proven. Optional unsupported capabilities remain explicit;
required unsupported capabilities make the verdict `BLOCKED`.
