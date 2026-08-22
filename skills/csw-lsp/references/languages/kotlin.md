# Kotlin language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Kotlin semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `kotlin-ls`
- Command: `kotlin-lsp`
- File extensions: `.kt .kts`
- Language id: `kotlin`

## Availability and optional installation

The official **JetBrains Kotlin LSP** is pre-release. Download a build from the [Kotlin/kotlin-lsp](https://github.com/Kotlin/kotlin-lsp) releases and put the `kotlin-lsp` launcher on PATH.

- **macOS:** Download the release archive, extract, then symlink the launcher: `ln -s /path/to/kotlin-lsp/kotlin-lsp.sh /usr/local/bin/kotlin-lsp`
- **Linux:** Same as macOS — extract the release and place/symlink `kotlin-lsp` on PATH.
- **Windows:** Extract the release and add the directory containing `kotlin-lsp.bat` to PATH (invoke as `kotlin-lsp`).

Requires a **JDK** on the machine to run the server.

Confirm it resolves:

```bash
command -v kotlin-lsp
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "kotlin-ls": {
      "command": "kotlin-lsp",
      "fileExtensions": {
        ".kt .kts": "kotlin"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Kotlin.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `kotlin-lsp` on PATH; reopen shell after install.
- **Pre-release churn:** the JetBrains server is early; pin a known-good release and expect occasional breakage.
- **No JDK:** server fails to start — install a JDK and/or set `JAVA_HOME`.
- **Slow first import:** Gradle resolution on first open can be slow on large projects; let it complete.
- **`.kts` scripts:** build/script files resolve more slowly than `.kt` sources; this is expected.

## Semantic proof
