# Configuration and root selection

Native language-server behavior depends on two coupled decisions: how the server is
declared and which directory becomes its workspace. Debug them separately, then
prove them together with a semantic request.

## Minimal declaration model

A native `lspServers` entry should communicate only what the host needs:

- stable server identifier as the map key;
- executable command string;
- fixed argument list;
- extension-to-language map;
- server-specific `initializationOptions` only when required.

Use the exact schema supported by the installed Copilot CLI version. Do not invent
keys based on another host's manifest. Inspect an existing valid plugin entry or
the native schema before editing.

Keep shell interpretation out of the command when an argv form is available. Avoid
inline pipelines, command substitution, user aliases, interactive prompts, and
machine-specific absolute paths. These make startup non-deterministic.

## Root evidence hierarchy

| Evidence | What it establishes | What it does not establish |
| --- | --- | --- |
| language workspace or solution | intended dependency graph | host selected it automatically |
| package or module manifest | local language ownership | all monorepo dependencies are indexed |
| repository tool configuration | expected tool behavior | LSP process is ready |
| version-control root | checkout boundary | correct language workspace |
| semantic result | observed indexed relationship | every other operation is healthy |

Prefer root evidence in this order:

1. explicit language workspace or solution marker;
2. language package or module manifest;
3. repository-owned tool configuration;
4. version-control root;
5. current directory only as a documented fallback.

The nearest marker is not always correct. A leaf package may inherit a monorepo
configuration, while a nested independent project may need isolation. Use known
imports and expected definition paths to decide.

## Single-root procedure

1. Start from the representative source file.
2. Walk upward and record every plausible marker.
3. Identify which marker owns the dependency graph for that file.
4. Start the server with that root.
5. Request a definition that crosses at least one file boundary.
6. Confirm the returned path remains inside the intended project or dependency
   resolution rules.

If the server indexes only the open file, the process may be ready but the project
root is not proven.

## Nested project procedure

For a repository containing an independent nested project:

1. choose one symbol from the parent and one from the nested project;
2. record the expected root and dependency boundary for each;
3. open each file in a fresh or clearly isolated session;
4. inspect the selected root and semantic results;
5. verify that parent-only settings do not leak into the nested project;
6. verify that the nested server does not index unrelated parent output.

The declaration selects a server by extension; it does not provide a documented root-marker
selector. Keep separate configurations only for genuinely different server or extension mappings,
not as a guessed substitute for workspace routing.

## Monorepo and multi-root projects

Before selecting a configuration, answer:

- Is there one dependency graph or several independent graphs?
- Are workspace references declared centrally?
- Do packages share a toolchain configuration?
- Can a symbol legitimately resolve across packages?
- Are generated types produced at the root or inside each package?
- Does the server support multi-root workspaces natively?

Prefer a workspace root when the language toolchain models the repository as one
graph. Prefer package roots when projects are intentionally independent and the
server cannot isolate them within one workspace.

## Working directory and path resolution

The executable resolution directory, server working directory, source root, and
configuration directory may differ. Record all four when troubleshooting.

Relative arguments must resolve from a documented directory. If a project-local
executable is used, prove how the host finds it in a fresh session rather than
relying on an interactive shell's `PATH` mutation.

Avoid embedding a user home path in a portable plugin. Prefer repository-relative
resolution or an executable already exposed by the approved environment.

## Environment handling

Pass only entries required for interpreter, SDK, or toolchain discovery. Never
serialize the complete user environment into a manifest or diagnostic packet.

For environment managers:

1. identify the repository-owned environment marker;
2. prove the selected interpreter or toolchain version;
3. launch through a deterministic project-local path when supported;
4. avoid activating an interactive shell profile as a hidden prerequisite;
5. document any machine prerequisite that remains.

Secret values are never LSP evidence. Redact them and report only that the required
variable was present or absent.

## Configuration validation

Validate in layers:

1. syntax and native schema;
2. command resolution and version;
3. language matching for the representative file;
4. root selection;
5. initialization and advertised capabilities;
6. semantic and diagnostic behavior;
7. shutdown and restart.

Passing layer 1 does not imply any later layer. Keep the first failing layer in the
verdict.

## Reload discipline

After a manifest or project-configuration change:

- stop the old session cleanly;
- verify the previous process exits;
- start a fresh Copilot CLI session or use the documented reload action;
- inspect native status again;
- repeat the semantic probe;
- check that no duplicate diagnostic publisher remains.

A successful result in a stale session is not proof of the new configuration.

## Portability checklist

Before accepting a declaration, confirm:

- no private absolute paths;
- no shell aliases or interactive profile dependency;
- no source-family naming or external-host residue;
- no undeclared global package assumption;
- project manifests used in the boundary analysis exist in a clean clone;
- generated inputs are either reproducible or called out;
- failure messages are actionable when the executable is absent.

The configuration is complete only when a clean-session semantic scenario proves
the selected root and executable together.
