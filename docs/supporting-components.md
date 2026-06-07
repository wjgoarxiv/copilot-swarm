# Supporting components — port / keep-native / skip decisions

CSW maps each reference "supporting" capability onto Copilot CLI's real surfaces.
Where Copilot already does something as well or better, CSW does not reimplement it
(no regression, no duplication).

## comment-checker — PORTED

A `postToolUse` hook (`hooks/comment-checker.mjs`) inspects edited content and, when
it sees comments that merely narrate the code (AI-slop), injects a gentle reminder
via `additionalContext` (which Copilot CLI honors on `postToolUse`). It nudges; it
never blocks. Verified against the real `postToolUse` payload shape (`toolArgs` is a
JSON string containing `{ path, file_text | content | new_str | ... }`).

## LSP diagnostics — KEPT NATIVE (skip custom)

Copilot CLI has first-class LSP support: the `/lsp` command and a plugin
`lspServers` manifest field. Reimplementing diagnostics in a `postToolUse` hook
would duplicate and likely regress the native experience. CSW relies on the native
surface; projects enable language servers via Copilot's own LSP configuration.

## Project rules / context-injection — COVERED (skip heavy engine)

Copilot CLI natively loads project rules from `AGENTS.md`,
`.github/copilot-instructions.md`, and `.github/instructions/*.instructions.md`.
CSW's own always-on doctrine is injected via the `sessionStart` hook
(`hooks/session-doctrine.mjs`). Between native custom-instructions and the
sessionStart injection, project + CSW context is already delivered, so a separate
dynamic rules engine would be redundant for this release.

## git guidance — SKIPPED

The reference recommended a bespoke git helper that does not exist on Copilot CLI.
Copilot already gates shell/git via its permission model
(`--allow-tool`/`--deny-tool`, e.g. `shell(git:*)`), so a `preToolUse` nag would add
noise without added safety. Skipped to keep the hook surface quiet and useful.

## telemetry — REMOVED

No call-home, no analytics, no external runtime dependency (privacy-first; also keeps
the package free of third-party infrastructure tokens).
