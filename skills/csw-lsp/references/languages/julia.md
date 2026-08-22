# Julia language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Julia semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `julials`
- Command: `julia --startup-file=no --history-file=no -e using LanguageServer; runserver()`
- File extensions: `.jl`
- Language id: `julia`

## Availability and optional installation

Install Julia (juliaup recommended), then add the `LanguageServer` package:

- **macOS:** `brew install juliaup && juliaup add release`
- **Linux:** `curl -fsSL https://install.julialang.org | sh` (installs juliaup)
- **Windows:** `winget install julia -s msstore` (installs juliaup)

Then add the package — ideally into a shared `@lsp` environment so it is not tied to one project:

```bash
julia --project=@lsp -e 'using Pkg; Pkg.add("LanguageServer")'
```

Confirm Julia resolves (the LSP binary IS `julia`):

```bash
command -v julia
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "julials": {
      "command": "julia",
      "args": [
        "--startup-file=no",
        "--history-file=no",
        "-e",
        "using LanguageServer; runserver()"
      ],
      "fileExtensions": {
        ".jl": "julia"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Julia.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `julia` on PATH (not a `julials` binary); reopen shell after juliaup install.
- **First run precompiles — be patient:** the initial launch compiles LanguageServer.jl and may take minutes with no output; do not kill it. Subsequent starts are fast.
- **Package not found:** `LanguageServer` must be installed in the environment the server runs in (e.g. `@lsp`); add it there and set `JULIA_PROJECT`.

## Semantic proof
