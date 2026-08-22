---
name: csw-lsp
description: Configure, diagnose, and prove language-server support through Copilot CLI native LSP surfaces, including root discovery, semantic operations, and graceful failure cases.
---

# LSP setup and verification

Use this skill when symbol navigation, references, rename support, or diagnostics are
missing, inconsistent, or misconfigured. Treat language-server readiness as a
protocol claim that needs a semantic proof, not as a process or configuration claim.

## Copilot CLI contract

Copilot CLI exposes native language-server support through `/lsp` and plugin
`lspServers` declarations. Use those surfaces. Do not reproduce the protocol with
hooks, shell wrappers, or a custom dispatcher when the native path is sufficient.

The proof chain is:

```text
language detected -> root selected -> process started -> protocol initialized
-> document opened -> semantic request succeeded -> diagnostics observed
```

Every arrow can fail independently. Report the first unproven transition.

## Language gate

Before configuration, confirm that the detected source language, repository language version,
required semantic capabilities, and available server are compatible. If no compatible native
server exists, report the capability as unsupported or blocked; do not build a substitute protocol
inside this skill.

## Read the focused references

- [Server matrix](references/server-matrix.md) — choose a server and record its
  executable, file extensions, project prerequisites, and version probe.
- [Configuration and project boundaries](references/configuration-and-roots.md) — construct the
  verified manifest shape, then reason separately about repository and language workspaces.
- [Diagnostics and troubleshooting](references/diagnostics-and-troubleshooting.md)
  — classify startup, initialization, timeout, protocol, and diagnostic failures.
- [Verification scenarios](references/verification-scenarios.md) — exercise
  definition, references, rename, diagnostics, unsupported files, and cleanup.
- [Native schema and lifecycle](references/native-schema-and-lifecycle.md) — use the verified
  `lspServers` shape, configuration scopes, lifecycle states, and timeout diagnosis.
- [Native operation catalog](references/native-operation-catalog.md) — use the supported semantic
  operations and treat rename as a write.
- [Language profiles](references/languages/README.md) — load one language-specific command,
  extension map, root gate, troubleshooting set, and semantic proof.

## Phase 1: establish the real project boundary

1. Locate the repository root and any nested package or workspace roots.
2. Inventory source extensions, manifests, lockfiles, generated trees, vendored
   trees, and existing editor or language-server configuration.
3. Select a representative file that is tracked, non-generated, and connected to
   at least one definition and reference.
4. Record the repository and language manifests that distinguish the intended project from its
   parent and from nested projects. These are project evidence, not `lspServers` schema fields.
5. If multiple roots are plausible, keep the ambiguity open until a semantic probe
   proves which root the server actually indexed.

Do not assume the current working directory is the protocol root. A monorepo root,
language workspace, and individual package may all be different directories.

## Phase 2: inspect the native status

1. Run `/lsp` or the available native status surface.
2. Record the configured server, command, arguments, matched language, selected
   root, and any initialization message.
3. Probe the executable version without changing global state.
4. Separate these states explicitly:
   - `UNCONFIGURED`: no declaration matches the language;
   - `UNAVAILABLE`: a declaration exists but the executable cannot start;
   - `STARTED`: the process exists but initialization is not proven;
   - `READY`: initialization and a semantic request succeed;
   - `DEGRADED`: some operations work but diagnostics, rename, or indexing do not.
5. Preserve the exact error class and a short sanitized excerpt. Never paste source
   contents, credentials, or the full environment into evidence.

## Phase 3: choose or repair the server

Prefer, in order:

1. a repository-declared executable and configuration;
2. an already-installed compatible executable;
3. a project-local dependency whose invocation is deterministic;
4. a new installation only with explicit user approval.

Verify the chosen version supports the repository language level and workspace
shape. A server that launches but cannot parse the project is not compatible.

When configuration is necessary, keep it minimal:

- one explicit command and deterministic argument list;
- the narrowest correct language mapping;
- no invented workspace-selection keys; keep project-boundary reasoning outside the declaration;
- only required environment entries, with no secrets embedded;
- no duplicate declaration that races an existing native entry.

After a change, reload the relevant Copilot CLI session. A stale session can retain
the previous command, root, or capabilities even when the manifest is correct.

## Phase 4: prove semantic behavior

Use a real, known symbol in the representative file.

1. Request go-to-definition and verify the returned path and location.
2. Request references and confirm at least one known call site is present.
3. Inspect diagnostics on a clean file, then introduce a reversible local defect or
   use an existing known defect and confirm a relevant diagnostic appears.
4. Restore the file and confirm the diagnostic clears.
5. Before rename, build a read-only impact map with repository search. The native rename operation
   applies its workspace edit; call it only when the user requested the code change and the dirty
   tree, expected files, generated boundaries, and rollback diff are known.
6. After rename, inspect every changed path and run repository tests.

A correct definition result plus a timed-out reference request is `DEGRADED`, not
`READY`. Record each capability independently.

## Phase 5: exercise boundaries

Test graceful behavior for the cases that matter to this repository:

- an unsupported extension should remain unsupported without repeated crashes;
- a malformed source file should produce diagnostics without killing the session;
- a file outside the selected root should not silently attach to the wrong project;
- a nested project should use its own root when its markers are more specific;
- a missing optional configuration file should produce an actionable error;
- an initialization timeout should be bounded and should not leave duplicate
  processes behind.

If the server is noisy on generated or vendored content, configure exclusions using
the server's supported project settings rather than hiding all diagnostics.

## Troubleshooting order

Investigate in dependency order:

1. executable discovery and version;
2. command arguments and working directory;
3. language-to-file matching;
4. root selection and project loading;
5. initialization handshake and advertised capabilities;
6. document synchronization;
7. individual semantic requests;
8. diagnostic publication and clearing;
9. resource use, timeout, and shutdown behavior.

Do not jump to reinstalling the server when the root is wrong. Do not enlarge
timeouts before identifying whether work is progressing.

## Safety and scope guardrails

- A process in `ps` is not proof of initialization.
- Valid JSON is not proof that Copilot CLI loaded the declaration.
- Do not install globally, modify user settings, or replace a project toolchain
  without explicit approval.
- Do not claim rename safety before inspecting the complete edit set.
- Keep logs and evidence free of source bodies, tokens, and private paths when a
  shorter relative path is sufficient.
- Stop temporary probes and verify no duplicate or orphan server remains.
- Preserve unrelated local changes and restore any defect created for diagnostics.

## Evidence packet

Report:

- repository and selected language root;
- language, server command, version, and configuration location;
- status transition reached (`UNCONFIGURED` through `DEGRADED`);
- definition and reference probes with expected versus observed paths;
- diagnostic appearance and clearing result;
- rename impact map or authorized application result;
- unsupported, malformed, nested-root, and timeout behavior exercised;
- cleanup result and any remaining editor-only limitation.

The final verdict is `READY`, `DEGRADED`, or `BLOCKED`. `BLOCKED` names the missing
authority, executable, project input, or native capability needed to proceed.
