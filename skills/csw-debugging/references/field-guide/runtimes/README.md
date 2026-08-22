# Runtime diagnosis routes

| Detected surface | Leaf | First distinction |
| --- | --- | --- |
| Node.js, JavaScript runtime, test runner, source maps | [JavaScript runtime](node.md) | source path versus executed artifact |
| Python interpreter, virtual environment, pytest, async task | [Python runtime](python.md) | selected interpreter and event-loop ownership |
| Go test or binary, goroutine, race, profile | [Go runtime](go.md) | source build identity and goroutine state |
| Rust test or binary, panic, Tokio task, optimized build | [Rust runtime](rust.md) | profile/features and backtrace evidence |
| ELF, Mach-O, or PE with unavailable source | [Native binary](native-binary.md) | authorization and artifact fingerprint |
| Single executable or application containing embedded source/assets | [Bundled application](bundled-app-binary.md) | bundler identity and legal retention boundary |

Each runtime leaf is a menu of probes. Prefer the repository's existing test, trace, or logging
surface. Attaching a debugger, profiling another process, or extracting embedded content may
require approval even when the tool is installed.
