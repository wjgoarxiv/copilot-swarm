# C# language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that C# semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `csharp`
- Command: `csharp-ls`
- File extensions: `.cs`
- Language id: `csharp`

## Availability and optional installation

Requires the **.NET SDK**. Install the tool globally:

- **macOS:** `dotnet tool install -g csharp-ls`
- **Linux:** `dotnet tool install -g csharp-ls`
- **Windows:** `dotnet tool install -g csharp-ls`

Global .NET tools land in `~/.dotnet/tools` — ensure that directory is on PATH (Windows: `%USERPROFILE%\.dotnet\tools`).

Confirm it resolves:

```bash
command -v csharp-ls
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "csharp": {
      "command": "csharp-ls",
      "fileExtensions": {
        ".cs": "csharp"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for C#.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `csharp-ls` / `roslyn-language-server` on PATH (`~/.dotnet/tools`); reopen shell after install.
- **No .NET SDK:** install the SDK (not just the runtime) before installing the tool.
- **No symbols:** run `dotnet restore`; an unrestored solution yields empty results.
- **Razor needs v5.8.0+:** older `roslyn-language-server` builds lack the `--stdio` Razor support — install with `--prerelease`.

## Semantic proof
