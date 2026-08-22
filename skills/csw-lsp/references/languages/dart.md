# Dart language-server profile

Use this profile after the main LSP workflow has selected the real project root and confirmed that Dart semantic navigation is required. The repository toolchain and an already installed compatible server take precedence over these examples.

## Detection

- Server id: `dart`
- Command: `dart language-server --lsp`
- File extensions: `.dart`
- Language id: `dart`

## Availability and optional installation

The language server ships inside the Dart SDK (and the Flutter SDK, which bundles Dart). There is no separate package to install — just put `dart` (or `flutter`) on PATH.

- **macOS:** `brew install dart` (or install Flutter and use its bundled `dart`)
- **Linux:** install the Dart SDK from your package manager / `https://dart.dev/get-dart`, or install Flutter
- **Windows:** install the Dart SDK or Flutter SDK and add its `bin` to PATH

Confirm it resolves:

```bash
command -v dart
```

## Copilot CLI repository manifest example

```json
{
  "lspServers": {
    "dart": {
      "command": "dart",
      "args": [
        "language-server",
        "--lsp"
      ],
      "fileExtensions": {
        ".dart": "dart"
      }
    }
  }
}
```

## Root and compatibility gate

1. Locate the authoritative manifest or workspace file for Dart.
2. Select the narrowest root that contains the representative source and its dependencies.
3. Confirm the server version supports the repository language level.
4. Run `/lsp`, record the displayed status, and begin a fresh CLI session after configuration changes.
5. Treat a successful start as process evidence only; semantic readiness still needs a known symbol.

## Troubleshooting

- **PATH:** `dart` must be on PATH; reopen the shell after installing the SDK. Flutter users: ensure `<flutter>/bin/cache/dart-sdk/bin` or the Flutter `bin` is exported.
- **Flutter vs Dart:** if you only have Flutter installed, the bundled `dart` works — make sure Flutter's `bin` is on PATH rather than relying on a separate Dart install.
- **SDK out of date:** run `dart --version` / `flutter upgrade` if analysis behaves oddly on newer language features.

## Semantic proof
