# Rust language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Rust semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `rust`
- Command: `rust-analyzer`
- File extensions: `.rs`
- Language id: `rust`

## Availability and optional installation

- **macOS:** `rustup component add rust-analyzer` (or `brew install rust-analyzer`)
- **Linux:** `rustup component add rust-analyzer`
- **Windows:** `rustup component add rust-analyzer`

The rustup component is the recommended path — it stays pinned to your toolchain.
`rust-analyzer` also needs the `rust-src` component to index the standard library
(`rustup component add rust-src`).

Confirm it resolves:

```bash
command -v rust-analyzer
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "rust": {
      "command": "rust-analyzer",
      "fileExtensions": {
        ".rs": "rust"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Rust.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `rust-analyzer` must be on PATH; reopen shell after install. The rustup shim lives in `~/.cargo/bin`.
- **Exits while loading rust-src:** if rust-analyzer crashes during stdlib indexing, reinstall the source component:

  ```bash
  rustup component remove rust-src && rustup component add rust-src
  ```

- **No proc-macro / build script support:** ensure the project builds with `cargo check`; rust-analyzer reuses the same toolchain.

## Semantic proof
