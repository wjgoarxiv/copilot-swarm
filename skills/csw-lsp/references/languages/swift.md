# Swift language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Swift semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `sourcekit-lsp`
- Command: `sourcekit-lsp`
- File extensions: `.swift .objc .objcpp`
- Language id: `swift`

## Availability and optional installation

`sourcekit-lsp` ships with the Swift toolchain — no separate install.

- **macOS:** `xcode-select --install` (or install full Xcode). It resolves to the active toolchain selected by `xcode-select`.
- **Linux:** Install a swift.org toolchain (`sourcekit-lsp` ships inside it); add the toolchain's `usr/bin` to PATH.
- **Windows:** Install the swift.org Windows toolchain; `sourcekit-lsp` is bundled.

Confirm it resolves:

```bash
command -v sourcekit-lsp
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "sourcekit-lsp": {
      "command": "sourcekit-lsp",
      "fileExtensions": {
        ".swift .objc .objcpp": "swift"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Swift.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `sourcekit-lsp` on PATH; reopen shell after install (or after `xcode-select -s`).
- **Wrong toolchain (macOS):** point `xcode-select` at the right Xcode/toolchain; mismatches cause stale or missing results.
- **No `Package.swift` / compile db:** add a SwiftPM manifest or generate `compile_commands.json` for accurate indexing.
- **Objective-C (`.objc`/`.objcpp`):** needs a compilation database to resolve headers and frameworks.
- **First build slow:** the server builds the module graph on first open; wait for it.

## Semantic proof
