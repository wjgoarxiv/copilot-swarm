# YAML language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that YAML semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `yaml-ls`
- Command: `yaml-language-server --stdio`
- File extensions: `.yaml .yml`
- Language id: `yaml`

## Availability and optional installation

- **macOS:** `npm install -g yaml-language-server`
- **Linux:** `npm install -g yaml-language-server`
- **Windows:** `npm install -g yaml-language-server` (PowerShell)

Confirm it resolves:

```bash
command -v yaml-language-server
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "yaml-ls": {
      "command": "yaml-language-server",
      "args": [
        "--stdio"
      ],
      "fileExtensions": {
        ".yaml .yml": "yaml"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for YAML.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `yaml-language-server` on PATH; reopen shell after `npm -g` install.
- **No validation:** no schema matched — add a `yaml.schemas` glob or a `$schema` modeline.
- **Wrong schema applied:** SchemaStore guessed by filename; pin explicitly under `yaml.schemas`.

## Semantic proof
