# TypeScript / JavaScript language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that TypeScript / JavaScript semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `typescript`
- Command: `typescript-language-server --stdio`
- File extensions: `.ts .tsx .js .jsx .mjs .cjs .mts .cts`
- Language id: `typescript`

## Availability and optional installation

- **macOS:** `npm install -g typescript-language-server typescript`
- **Linux:** `npm install -g typescript-language-server typescript`
- **Windows:** `npm install -g typescript-language-server typescript` (PowerShell or cmd)

`typescript-language-server` is only a thin wrapper — it needs the `typescript`
package (`tsserver`) present too, either globally or in the project's
`node_modules`. Always install both.

Confirm it resolves:

```bash
command -v typescript-language-server
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "typescript": {
      "command": "typescript-language-server",
      "args": [
        "--stdio"
      ],
      "fileExtensions": {
        ".ts .tsx .js .jsx .mjs .cjs .mts .cts": "typescript"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for TypeScript / JavaScript.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `typescript-language-server` must be on PATH; reopen shell after `npm i -g`. Check your global bin with `npm bin -g`.
- **Missing tsserver:** errors like "Could not find tsserver" mean the `typescript` package is absent — install it globally or in the project.

## Semantic proof
