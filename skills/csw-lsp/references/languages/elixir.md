# Elixir language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Elixir semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `elixir-ls`
- Command: `elixir-ls`
- File extensions: `.ex .exs`
- Language id: `elixir`

## Availability and optional installation

ElixirLS needs Erlang/OTP and Elixir installed first. Build the release from
`https://github.com/elixir-lsp/elixir-ls` and put the `elixir-ls` launcher script on PATH.

- **macOS:** `brew install elixir-ls` (Homebrew provides the launcher), or build the release manually
- **Linux:** clone elixir-ls, run `mix deps.get && mix compile && mix elixir_ls.release2 -o release`, then add `release/` to PATH
- **Windows:** build the release and add the `release` dir (use the `.bat` launcher) to PATH

Confirm it resolves:

```bash
command -v elixir-ls
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "elixir-ls": {
      "command": "elixir-ls",
      "fileExtensions": {
        ".ex .exs": "elixir"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Elixir.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `elixir-ls` must be on PATH; reopen the shell after install.
- **asdf users:** the launcher is a shim — after `asdf install`, run `asdf reshim elixir` so the `elixir-ls` shim resolves, and ensure the Erlang/Elixir versions match the build.
- **First start is slow:** ElixirLS compiles your deps on first run; initial diagnostics can take a while on large projects.
- **OTP mismatch:** build elixir-ls with the same Erlang/Elixir versions you use for the project to avoid bytecode errors.

## Semantic proof
