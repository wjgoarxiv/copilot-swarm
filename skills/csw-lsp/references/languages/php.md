# PHP language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that PHP semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `php`
- Command: `intelephense --stdio`
- File extensions: `.php`
- Language id: `php`

## Availability and optional installation

Intelephense is a Node package, so Node.js (and npm) must be installed first.

- **macOS:** `npm install -g intelephense`
- **Linux:** `npm install -g intelephense`
- **Windows:** `npm install -g intelephense`

Confirm it resolves:

```bash
command -v intelephense
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "php": {
      "command": "intelephense",
      "args": [
        "--stdio"
      ],
      "fileExtensions": {
        ".php": "php"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for PHP.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `intelephense` must be on PATH; reopen the shell after a global npm install. If missing, check `npm bin -g` is on PATH.
- **No Node:** Intelephense fails to start without Node.js. Install Node, then reinstall.
- **Wrong PHP version inference:** set `intelephense.environment.phpVersion` via `initialization` to match your project.

## Semantic proof
