# Go language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Go semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `gopls`
- Command: `gopls`
- File extensions: `.go`
- Language id: `go`

## Availability and optional installation

- **macOS:** `go install golang.org/x/tools/gopls@<compatible-version>` (or an approved package manager)
- **Linux:** `go install golang.org/x/tools/gopls@<compatible-version>`
- **Windows:** `go install golang.org/x/tools/gopls@<compatible-version>`

Requires the Go toolchain. `go install` drops the binary in `$GOPATH/bin`
(default `~/go/bin`) — that directory must be on PATH.

```bash
export PATH="$PATH:$(go env GOPATH)/bin"
```

Confirm it resolves:

```bash
command -v gopls
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "gopls": {
      "command": "gopls",
      "fileExtensions": {
        ".go": "go"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Go.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `gopls` must be on PATH; ensure `$(go env GOPATH)/bin` is exported, then reopen the shell.
- **No diagnostics / "no required module":** open the directory containing `go.mod` as the workspace root. Outside a module, gopls degrades. Run `go mod tidy` if dependencies are unresolved.
- **Stale toolchain:** select a gopls version compatible with the repository Go version; install only with approval.

## Semantic proof
