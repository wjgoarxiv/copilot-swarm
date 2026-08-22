# C / C++ language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that C / C++ semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `clangd`
- Command: `clangd --background-index --clang-tidy`
- File extensions: `.c .cpp .cc .cxx .c++ .h .hpp .hh .hxx .h++`
- Language id: `cpp`

## Availability and optional installation

- **macOS:** `brew install llvm` (clangd ships in the LLVM keg; add its `bin` to PATH)
- **Linux:** `apt install clangd` (Debian/Ubuntu); use your distro package elsewhere
- **Windows:** install LLVM from `https://releases.llvm.org` or `winget install LLVM.LLVM`

See `https://clangd.llvm.org/installation` for other platforms.

Confirm it resolves:

```bash
command -v clangd
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "clangd": {
      "command": "clangd",
      "args": [
        "--background-index",
        "--clang-tidy"
      ],
      "fileExtensions": {
        ".c .cpp .cc .cxx .c++ .h .hpp .hh .hxx .h++": "cpp"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for C / C++.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `clangd` must be on PATH; reopen shell after install. Homebrew LLVM is keg-only — add `$(brew --prefix llvm)/bin` to PATH.
- **Spurious "file not found" / unknown flags:** missing or stale `compile_commands.json` — regenerate it after changing the build.
- **Header-only diagnostics wrong:** ensure the header's translation unit appears in the compile database, or add a `.clangd` `CompileFlags` block.

## Semantic proof
