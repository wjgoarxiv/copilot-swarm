# Ruby language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Ruby semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `ruby-lsp`
- Command: `ruby-lsp`
- File extensions: `.rb .rake .gemspec .ru`
- Language id: `ruby`

## Availability and optional installation

- **macOS:** `gem install rubocop` (and `gem install ruby-lsp` for the install hint's gem)
- **Linux:** `gem install rubocop`
- **Windows:** `gem install rubocop`

In a Bundler project, prefer adding `rubocop` to the `Gemfile` and running via `bundle exec`.

Confirm it resolves (check `rubocop`, since that is what runs):

```bash
command -v rubocop
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "ruby-lsp": {
      "command": "ruby-lsp",
      "fileExtensions": {
        ".rb .rake .gemspec .ru": "ruby"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Ruby.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `rubocop` on PATH (that is the invoked binary, not `ruby-lsp`); reopen shell after install.
- **`rubocop` not found:** the advisory command fails even if the `ruby-lsp` gem is installed — install RuboCop with `gem install rubocop`.
- **Bundler mismatch:** if the project pins RuboCop in its `Gemfile`, run inside the bundle so versions match.
- **No diagnostics:** check `.rubocop.yml` is valid and not disabling everything.

## Semantic proof
