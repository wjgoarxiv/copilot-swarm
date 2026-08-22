# Copilot CLI LSP schema and lifecycle

Use this reference when adding or repairing a server declaration. Verify the installed CLI version
and its current documented schema before editing because this host surface can evolve.

## Configuration scopes

| Scope | Location | Use |
| --- | --- | --- |
| Repository | `.github/lsp.json` | Project-owned server definition shared with contributors |
| User | `~/.copilot/lsp-config.json` | Personal server definition that must not leak into the repo |
| Plugin | plugin manifest surface | Server distributed intentionally with a plugin |

Do not copy a user configuration into the repository. Do not embed credentials, a complete shell
environment, machine-private paths, or an executable that the package does not distribute.

## Minimal schema

```json
{
  "lspServers": {
    "example": {
      "command": "example-language-server",
      "args": ["--stdio"],
      "fileExtensions": {
        ".example": "example"
      }
    }
  }
}
```

The documented portable core is a command string, an argument array, an extension-to-language
mapping, and server-specific `initializationOptions` when required. Do not claim additional fields
are portable unless the installed Copilot CLI documentation or schema explicitly shows them.

Do not combine command and arguments into an invented array shape. Do not invent ranking fields,
root-marker keys, or alternate top-level containers. JSON validity is necessary but does not prove
that Copilot CLI loaded the declaration.

## Project-boundary semantics

Configuration location controls ownership of the declaration; it is not a workspace selector.
The documented declaration shape does not expose a root-marker key. In a monorepo, inspect language
manifests, invoke Copilot CLI from the intended repository boundary, and use known symbol
relationships to verify what the server indexed. If two boundaries remain plausible, preserve the
ambiguity and let semantic results distinguish them instead of inventing configuration fields.

## Native lifecycle

1. Run `/lsp` and record the configured server status shown by the installed CLI.
2. Confirm the executable and version without installing or changing global state.
3. After a declaration change, begin a fresh session unless the installed `/lsp` help explicitly
   exposes a reload action.
5. Exercise a known semantic operation from a representative file.
6. Classify the state as `UNCONFIGURED`, `UNAVAILABLE`, `STARTED`, `READY`, or `DEGRADED`.
7. Stop temporary probes and verify duplicate server processes are absent.

The `/lsp` status surface can show that a server is configured or active; it cannot prove that the
correct project was indexed or that every requested capability works. A process in `ps` is even
weaker evidence.

## Timeout diagnosis

Investigate in order: executable discovery, spawn, initialization, indexing, and the individual
request. Change timeouts only through a currently documented host or server setting after observing
progress. A larger timeout must not hide a wrong project boundary, unsupported language version,
deadlock, or duplicate server.

## Evidence template

```text
CLI version:
Configuration scope and path:
Server command and version:
Selected root:
Matched extensions:
Lifecycle state reached:
First unproven transition:
Semantic operations observed:
Boundary case:
Cleanup observation:
Verdict: READY | DEGRADED | BLOCKED
```
