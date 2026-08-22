# Python language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Python semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `basedpyright`
- Command: `basedpyright-langserver --stdio`
- File extensions: `.py .pyi`
- Language id: `python`

## Availability and optional installation

- **macOS:** `pip install basedpyright` (or `uv tool install basedpyright`)
- **Linux:** `pip install basedpyright` (or `uv tool install basedpyright`)
- **Windows:** `pip install basedpyright`

Prefer `uv tool install basedpyright` when the project uses uv — it keeps the
server isolated from project venvs and always on PATH.

Confirm it resolves:

```bash
command -v basedpyright-langserver
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "basedpyright": {
      "command": "basedpyright-langserver",
      "args": [
        "--stdio"
      ],
      "fileExtensions": {
        ".py .pyi": "python"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Python.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `basedpyright-langserver` must be on PATH; reopen shell after install. `uv tool install` writes to `~/.local/bin`.
- **Wrong interpreter / missing imports:** the server must see the project venv. Set `python.pythonPath` / `venvPath` in `pyrightconfig.json`, or activate the venv before launching.

## Semantic proof
