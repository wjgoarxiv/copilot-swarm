# Lua language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Lua semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `lua-ls`
- Command: `lua-language-server`
- File extensions: `.lua`
- Language id: `lua`

## Availability and optional installation

See `https://github.com/LuaLS/lua-language-server`.

- **macOS:** `brew install lua-language-server`
- **Linux:** download a release from GitHub, or `pacman -S lua-language-server` (Arch) / AUR
- **Windows:** download a release from the GitHub releases page and add its `bin` to PATH

Confirm it resolves:

```bash
command -v lua-language-server
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "lua-ls": {
      "command": "lua-language-server",
      "fileExtensions": {
        ".lua": "lua"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Lua.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `lua-language-server` must be on PATH; reopen the shell after install.
- **Undefined `vim` global:** add `vim` to `Lua.diagnostics.globals` and set `Lua.workspace.library` (see above) for Neovim work.
- **Wrong runtime version:** set `Lua.runtime.version` (`LuaJIT`, `Lua 5.4`, etc.) to match your interpreter, or stdlib functions report as undefined.

## Semantic proof
