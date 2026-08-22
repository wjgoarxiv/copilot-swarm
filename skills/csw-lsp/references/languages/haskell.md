# Haskell language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Haskell semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `haskell-language-server`
- Command: `haskell-language-server-wrapper --lsp`
- File extensions: `.hs .lhs`
- Language id: `haskell`

## Availability and optional installation

- **macOS:** `ghcup install hls` (install ghcup via `brew install ghcup` or the official script)
- **Linux:** `ghcup install hls` (ghcup script from https://www.haskell.org/ghcup/)
- **Windows:** `ghcup install hls` (ghcup is installed via the Windows installer / PowerShell bootstrap)

HLS needs a working GHC plus Cabal and/or Stack. Install a matching toolchain first:

```bash
ghcup install ghc
ghcup install cabal
```

Confirm it resolves:

```bash
command -v haskell-language-server-wrapper
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "haskell-language-server": {
      "command": "haskell-language-server-wrapper",
      "args": [
        "--lsp"
      ],
      "fileExtensions": {
        ".hs .lhs": "haskell"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Haskell.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `haskell-language-server-wrapper` on PATH; reopen shell after `ghcup install`.
- **GHC mismatch:** the installed HLS must support your project's GHC version — run `ghcup install hls` for that GHC, or align GHC to a supported one.
- **No cradle:** multi-package repos may need a `hie.yaml`; generate one with `gen-hie > hie.yaml`.
- **Slow first load:** HLS compiles dependencies on first open; let it finish indexing.

## Semantic proof
