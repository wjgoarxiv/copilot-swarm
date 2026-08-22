# Bash language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Bash semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `bash`
- Command: `bash-language-server start`
- File extensions: `.sh .bash .zsh .ksh`
- Language id: `shellscript`

## Availability and optional installation

- **macOS:** `npm install -g bash-language-server`
- **Linux:** `npm install -g bash-language-server`
- **Windows:** `npm install -g bash-language-server` (PowerShell)

For real diagnostics, also install `shellcheck`:

- **macOS:** `brew install shellcheck`
- **Linux:** `apt install shellcheck` (or `dnf install ShellCheck`)
- **Windows:** `scoop install shellcheck`

Confirm it resolves:

```bash
command -v bash-language-server
command -v shellcheck
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "bash": {
      "command": "bash-language-server",
      "args": [
        "start"
      ],
      "fileExtensions": {
        ".sh .bash .zsh .ksh": "shellscript"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Bash.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `bash-language-server` on PATH; reopen shell after `npm -g` install.
- **No diagnostics:** `shellcheck` missing — diagnostics are powered by it; install and reopen.
- **Wrong shell dialect:** `.zsh`/`.ksh` are linted as bash; shellcheck may flag shell-specific syntax.

## Semantic proof
