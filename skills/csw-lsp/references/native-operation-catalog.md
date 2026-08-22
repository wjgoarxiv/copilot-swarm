# Native semantic operation catalog

Copilot CLI exposes language-server semantics through its native LSP tool and `/lsp` management
surface. Do not translate these operations into invented shell commands or pseudo-functions.
Location-based operations use one-based line and character positions in the installed native tool.

| Operation | Purpose | Proof |
| --- | --- | --- |
| `goToDefinition` | Resolve a symbol declaration | Expected tracked path and location returned |
| `findReferences` | Find known uses | At least one independently known call site present |
| `hover` | Resolve type or documentation | Content matches the selected symbol and project version |
| `documentSymbol` | Enumerate symbols in one document | Known declarations present without unrelated-root noise |
| `workspaceSymbol` | Search the indexed workspace | Expected symbol found; optionally constrain language |
| `goToImplementation` | Resolve interface or abstract implementations | Known implementation path returned |
| `incomingCalls` | Find callers of a callable | Known caller included |
| `outgoingCalls` | Find calls made by a callable | Known callee included |
| `rename` | Apply a workspace edit | Authorized complete diff and repository verification |

## Read-only operation workflow

1. Choose a tracked, non-generated file and a stable known symbol.
2. Record the expected result from repository text and project structure before calling LSP.
3. Run one operation.
4. Compare returned paths, positions, and root against the expectation.
5. If it fails, keep the exact operation and first error class; do not immediately reinstall.

Definition plus references is the minimum readiness pair for navigation. Other capabilities are
reported independently. If definition works but references time out, the server is `DEGRADED`.

## Rename is a write

The native `rename` operation is not a preview-only API. After permission checks it applies the
workspace edit. Use it only when the user requested a code change and all of these are true:

- the current dirty tree and ownership of existing changes are known;
- the target symbol and new name are unambiguous;
- expected affected files are bounded;
- generated, vendored, migration, and public-API boundaries were considered;
- rollback is the exact operation diff, not a destructive whole-file reset.

After rename, inspect every changed path, search for stale spellings where semantically relevant,
run focused and adjacent tests, typecheck/build as configured, and exercise the real consumer when
distribution changes. If preview is required, use repository search and a read-only impact map;
do not call the mutating operation.

## Diagnostics caveat

Diagnostics may be visible through the host and are a documented LSP capability, but they are not
an explicit operation in the native operation list used here. Observe them through the supported
host UI or run the repository's typecheck and lint commands. Do not claim a diagnostics operation
was called when no such native operation exists.

## Boundary matrix

| Boundary | Expected behavior |
| --- | --- |
| Unsupported extension | No crash loop or attachment to an unrelated server |
| Malformed source | Actionable diagnostic or parse failure; server remains available |
| File outside root | No silent indexing under the wrong project |
| Nested project | More specific language root selected when its manifest owns the file |
| Initialization timeout | Bounded failure and no duplicate process |
| Cancelled request | Caller regains control and later operations remain usable |

Report the first failed transition and the exact missing authority, executable, project input, or
native capability. Do not turn a partial semantic result into a blanket `READY` verdict.
