# Zig language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Zig semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `zls`
- Command: `zls`
- File extensions: `.zig .zon`
- Language id: `zig`

## Availability and optional installation

ZLS (the Zig Language Server) must be built against the **same Zig version** you use.
See `https://github.com/zigtools/zls`.

- **macOS:** `brew install zls`
- **Linux:** download a prebuilt release matching your Zig version, or `zig build -Doptimize=ReleaseSafe` from the zls source
- **Windows:** download the matching release from the zls GitHub releases, or build from source

Confirm it resolves:

```bash
command -v zls
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "zls": {
      "command": "zls",
      "fileExtensions": {
        ".zig .zon": "zig"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Zig.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **VERSION MATCH (critical):** zls version MUST match your zig version — build/install zls against the exact same Zig. A mismatch causes crashes, parse errors, or silent failures. After upgrading Zig, upgrade/rebuild zls too.
- **PATH:** `zls` must be on PATH; reopen the shell after install.
- **zig not found:** zls invokes `zig` for builds — make sure `zig` itself is also on PATH.

## Semantic proof
