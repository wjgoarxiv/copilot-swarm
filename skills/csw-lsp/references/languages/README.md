# Language profile index

Select a profile only after the repository language, authoritative root, and required semantic
operation are known. Each profile supplies a minimal repository manifest example, availability
notes, compatibility traps, and a semantic proof.

| Language | Profile |
| --- | --- |
| Bash and shell scripts | [Bash](bash.md) |
| C and C++ | [C and C++](c-cpp.md) |
| C# | [C#](csharp.md) |
| Dart and Flutter | [Dart](dart.md) |
| Elixir | [Elixir](elixir.md) |
| Go | [Go](go.md) |
| Haskell | [Haskell](haskell.md) |
| Java | [Java](java.md) |
| Julia | [Julia](julia.md) |
| Kotlin | [Kotlin](kotlin.md) |
| Lua | [Lua](lua.md) |
| PHP | [PHP](php.md) |
| Python | [Python](python.md) |
| Ruby | [Ruby](ruby.md) |
| Rust | [Rust](rust.md) |
| Swift | [Swift](swift.md) |
| Terraform | [Terraform](terraform.md) |
| TypeScript and JavaScript | [TypeScript](typescript.md) |
| YAML | [YAML](yaml.md) |
| Zig | [Zig](zig.md) |

These are profiles, not install scripts. Preserve project-local executables, lockfiles, toolchain
managers, and language versions. If the profile command is unavailable, report `UNAVAILABLE` or
request approval; do not silently install a global server.

## Rules shared by every profile

Availability notes describe common upstream paths; they are not authorization to install globally,
change a user toolchain, or download code. Prefer a repository-local executable or an existing
installation. If none is available, stop at `UNAVAILABLE` and request the required authority.

Place repository-scoped configuration in `.github/lsp.json` only when the repository should own
it. The verified portable schema separates `command` from `args`, maps extensions through
`fileExtensions`, and permits server-specific `initializationOptions` when required. Do not add
ranking fields, root-marker fields, or alternate top-level containers. Reconcile any documented
schema difference in the installed CLI before editing.

For semantic proof, use a tracked, non-generated source file and a known symbol. Verify definition
and at least one reference against expected paths; exercise hover or document symbols when useful.
Observe diagnostics through the host UI or repository checks rather than an invented operation.
Rename is mutating and requires an authorized change, dirty-tree check, bounded impact map, complete
diff inspection, and repository verification.

If a server starts but an operation times out, resolves the wrong project boundary, or omits a known
result, report `DEGRADED` at the first unproven transition. Stop temporary processes and restore any
reversible diagnostic defect. A process, valid manifest, or clean status display is weaker evidence
than the expected semantic result.
