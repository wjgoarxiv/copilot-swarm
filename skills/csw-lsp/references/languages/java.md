# Java language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Java semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `jdtls`
- Command: `jdtls`
- File extensions: `.java`
- Language id: `java`

## Availability and optional installation

- **macOS:** `brew install jdtls`
- **Linux:** Download from [eclipse-jdtls/eclipse.jdt.ls](https://github.com/eclipse-jdtls/eclipse.jdt.ls) releases, extract, and wrap the launcher as `jdtls` on PATH (some distros package it as `jdtls`/`jdt-language-server`).
- **Windows:** Download the release archive and add the `jdtls` launcher (`bin/jdtls.bat` or the Python wrapper) to PATH.

Requires a **JDK 17+** to run the language server itself (the project may target an older Java version).

Confirm it resolves:

```bash
command -v jdtls
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "jdtls": {
      "command": "jdtls",
      "fileExtensions": {
        ".java": "java"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Java.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `jdtls` on PATH; reopen shell after install.
- **No JDK found:** server exits immediately — set `JAVA_HOME` to a JDK 17+.
- **Slow / no completions at first:** the initial classpath index can take a minute or more on large Maven/Gradle projects; wait for it to finish.
- **Stale state:** delete the jdtls workspace data dir to force a clean re-index if results go wrong after big dependency changes.
- **Build tool required:** keep `pom.xml` / `build.gradle` valid; a broken build descriptor breaks symbol resolution.

## Semantic proof
