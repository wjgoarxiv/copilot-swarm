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

## failure recovery — PORTED

A `postToolUseFailure` hook (`hooks/failure-guide.mjs`) adds static, non-secret
recovery guidance after a failed tool call and points the model to the bundled
`csw-debugging` skill. It deliberately does not echo the untrusted error body. The hook
uses Copilot CLI's documented exit-code `2` warning path and stays inert in safe mode.

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

## git guidance — PORTED AS A SKILL

The `csw-git` skill provides conservative status, history, commit, rebase, and
recovery discipline. It does not bypass Copilot CLI's shell permission model and
does not install a noisy `preToolUse` hook.

## specialist guidance — PORTED AS SKILLS

Debugging, requirements interviewing, frontend design, deep repository guidance,
programming discipline, safe refactoring, AI-code cleanup, LSP setup, and visual QA
are packaged as discoverable skills. Each uses Copilot CLI terminology and native
task, permission, LSP, browser, and screenshot surfaces rather than assuming a
foreign host tool contract.

Every shipped skill now uses a layered package: its `SKILL.md` contains the activation
contract and complete decision flow, while linked `references/` files hold reusable
matrices, templates, edge procedures, language/runtime guidance, and verification
packets. `npm run audit:skills` checks all 15 package identities, linked-reference
reachability, source cleanliness, and quantitative depth without loading every
reference into each session.

## Subagent scheduling — KEPT NATIVE

Copilot CLI owns subagent lifecycle and concurrency. CSW uses the host `task` tool
for model-driven delegation, `/fleet` for user-visible parallel execution, and
`/tasks` for oversight and cancellation. CSW adds worker roles and evidence
discipline rather than a second scheduler.

An investigation role's prose does not enforce non-mutation. The conductor must
withhold mutating tools with the host deny/available-tool policy. Workers that can
write must use isolated git worktrees so their changes can be reviewed before
integration.

## telemetry — REMOVED

No call-home, no analytics, no external runtime dependency (privacy-first; also keeps
the package free of third-party infrastructure tokens).
